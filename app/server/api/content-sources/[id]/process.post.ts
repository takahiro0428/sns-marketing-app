import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from '~/server/utils/firebase-admin'
import { chunkText, generateEmbeddings } from '~/server/utils/embeddings'

export default defineEventHandler(async (event) => {
  const contentSourceId = getRouterParam(event, 'id')
  if (!contentSourceId) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_CONTENT_SOURCE_ID' })
  }

  const auth = event.context.auth as { uid: string } | undefined
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED' })
  }

  const db = getAdminFirestore()

  // Fetch content source
  const contentRef = db.collection('contentSources').doc(contentSourceId)
  const contentDoc = await contentRef.get()
  if (!contentDoc.exists) {
    throw createError({ statusCode: 404, statusMessage: 'CONTENT_SOURCE_NOT_FOUND' })
  }

  const content = contentDoc.data()!
  if (content.userId !== auth.uid) {
    throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  }

  const rawText = (content.rawText as string) || ''
  if (!rawText.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'CONTENT_SOURCE_EMPTY' })
  }

  const projectId = content.projectId as string

  // Atomically check and set processingStatus to prevent concurrent processing
  const acquired = await db.runTransaction(async (tx) => {
    const freshDoc = await tx.get(contentRef)
    if (freshDoc.data()?.processingStatus === 'processing') {
      return false
    }
    tx.update(contentRef, { processingStatus: 'processing', updatedAt: FieldValue.serverTimestamp() })
    return true
  })

  if (!acquired) {
    return { chunksCreated: 0, skipped: true }
  }

  try {
    // 1. Delete existing chunks for this content source (idempotent re-processing)
    const existingChunks = await db.collection('contentChunks')
      .where('contentSourceId', '==', contentSourceId)
      .where('userId', '==', auth.uid)
      .get()

    if (!existingChunks.empty) {
      // Batch deletes in groups of 500 (Firestore limit)
      const deleteBatchSize = 500
      for (let i = 0; i < existingChunks.docs.length; i += deleteBatchSize) {
        const batch = db.batch()
        const end = Math.min(i + deleteBatchSize, existingChunks.docs.length)
        for (let j = i; j < end; j++) {
          batch.delete(existingChunks.docs[j].ref)
        }
        await batch.commit()
      }
    }

    // 2. Chunk the text
    const chunks = chunkText(rawText)
    if (chunks.length === 0) {
      await contentRef.update({ processingStatus: 'completed', updatedAt: FieldValue.serverTimestamp() })
      return { chunksCreated: 0 }
    }

    // 3. Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks)

    // 4. Save chunks with embeddings to Firestore
    const chunksCol = db.collection('contentChunks')
    const writeBatchSize = 500
    for (let i = 0; i < chunks.length; i += writeBatchSize) {
      const batch = db.batch()
      const end = Math.min(i + writeBatchSize, chunks.length)
      for (let j = i; j < end; j++) {
        const ref = chunksCol.doc()
        batch.set(ref, {
          contentSourceId,
          projectId,
          userId: auth.uid,
          chunkIndex: j,
          text: chunks[j],
          embedding: FieldValue.vector(embeddings[j]),
          createdAt: FieldValue.serverTimestamp(),
        })
      }
      await batch.commit()
    }

    // 5. Mark content source as completed
    await contentRef.update({ processingStatus: 'completed', updatedAt: FieldValue.serverTimestamp() })

    return { chunksCreated: chunks.length }
  } catch (error) {
    // Mark as failed but don't block the error response
    try {
      await contentRef.update({ processingStatus: 'failed', updatedAt: FieldValue.serverTimestamp() })
    } catch {
      // Status update failure is non-blocking
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'PROCESSING_FAILED',
    })
  }
})
