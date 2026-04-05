import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from './firebase-admin'
import { generateEmbeddings } from './embeddings'

interface RetrievedContent {
  text: string
  sourceTitle: string
  chunkIndex: number
}

/**
 * Retrieve relevant content from all project documents using vector search.
 * Falls back to raw text concatenation when no chunks exist.
 *
 * @param projectId - The project to search within
 * @param userId - The authenticated user's ID
 * @param query - Optional search query (user requirements or chapter context)
 * @param charLimit - Maximum characters to return (default 30000)
 * @returns Combined text from relevant content sources with source labels
 */
export async function retrieveRelevantContent(
  projectId: string,
  userId: string,
  query?: string,
  charLimit = 30000,
): Promise<string> {
  const db = getAdminFirestore()
  const chunksCol = db.collection('contentChunks')

  // Check if any chunks exist for this project
  const countSnap = await chunksCol
    .where('projectId', '==', projectId)
    .where('userId', '==', userId)
    .limit(1)
    .get()

  if (countSnap.empty) {
    // Fallback: use rawText from contentSources directly
    return await fallbackToRawText(db, projectId, userId, charLimit)
  }

  let chunks: RetrievedContent[]

  if (query && query.trim()) {
    // Vector search: embed query and find nearest chunks
    chunks = await vectorSearch(db, projectId, userId, query, charLimit)
  } else {
    // No query: fetch all chunks ordered by source and index
    chunks = await fetchAllChunks(db, projectId, userId, charLimit)
  }

  if (chunks.length === 0) {
    return await fallbackToRawText(db, projectId, userId, charLimit)
  }

  return formatChunks(chunks, charLimit)
}

async function vectorSearch(
  db: FirebaseFirestore.Firestore,
  projectId: string,
  userId: string,
  query: string,
  charLimit: number,
): Promise<RetrievedContent[]> {
  try {
    const [queryEmbedding] = await generateEmbeddings([query])

    const vectorQuery = db.collection('contentChunks')
      .where('projectId', '==', projectId)
      .where('userId', '==', userId)
      .findNearest('embedding', FieldValue.vector(queryEmbedding), {
        limit: 50,
        distanceMeasure: 'COSINE',
      })

    const snap = await vectorQuery.get()

    // Resolve source titles
    const sourceIds = [...new Set(snap.docs.map((d) => d.data().contentSourceId as string))]
    const titleMap = await resolveSourceTitles(db, sourceIds)

    return snap.docs.map((d) => {
      const data = d.data()
      return {
        text: data.text as string,
        sourceTitle: titleMap.get(data.contentSourceId as string) || '不明なソース',
        chunkIndex: data.chunkIndex as number,
      }
    })
  } catch {
    // Vector search failed (index not ready, etc.) — fall back to fetching all chunks
    return await fetchAllChunks(db, projectId, userId, charLimit)
  }
}

async function fetchAllChunks(
  db: FirebaseFirestore.Firestore,
  projectId: string,
  userId: string,
  charLimit: number,
): Promise<RetrievedContent[]> {
  // Estimate max chunks needed: charLimit / average chunk size (~600 chars) + margin
  const estimatedMaxChunks = Math.ceil(charLimit / 600) + 10
  const snap = await db.collection('contentChunks')
    .where('projectId', '==', projectId)
    .where('userId', '==', userId)
    .orderBy('chunkIndex', 'asc')
    .limit(estimatedMaxChunks)
    .get()

  if (snap.empty) return []

  const sourceIds = [...new Set(snap.docs.map((d) => d.data().contentSourceId as string))]
  const titleMap = await resolveSourceTitles(db, sourceIds)

  return snap.docs.map((d) => {
    const data = d.data()
    return {
      text: data.text as string,
      sourceTitle: titleMap.get(data.contentSourceId as string) || '不明なソース',
      chunkIndex: data.chunkIndex as number,
    }
  })
}

async function fallbackToRawText(
  db: FirebaseFirestore.Firestore,
  projectId: string,
  userId: string,
  charLimit: number,
): Promise<string> {
  const snap = await db.collection('contentSources')
    .where('projectId', '==', projectId)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get()

  if (snap.empty) return ''

  let combined = ''
  for (const doc of snap.docs) {
    const data = doc.data()
    const rawText = (data.rawText as string) || ''
    if (!rawText.trim()) continue

    const segment = `\n--- ソース: ${data.title as string} ---\n${rawText}`
    if (combined.length + segment.length > charLimit) {
      const remaining = charLimit - combined.length
      if (remaining > 100) {
        combined += segment.substring(0, remaining)
      }
      break
    }
    combined += segment
  }

  return combined
}

async function resolveSourceTitles(
  db: FirebaseFirestore.Firestore,
  sourceIds: string[],
): Promise<Map<string, string>> {
  const titleMap = new Map<string, string>()
  if (sourceIds.length === 0) return titleMap

  const refs = sourceIds.map((id) => db.collection('contentSources').doc(id))
  const docs = await db.getAll(...refs)
  for (const doc of docs) {
    if (doc.exists) {
      titleMap.set(doc.id, doc.data()!.title as string)
    }
  }
  return titleMap
}

function formatChunks(chunks: RetrievedContent[], charLimit: number): string {
  let result = ''
  let currentSource = ''

  for (const chunk of chunks) {
    const header = chunk.sourceTitle !== currentSource
      ? `\n--- ソース: ${chunk.sourceTitle} ---\n`
      : '\n'
    currentSource = chunk.sourceTitle

    const segment = header + chunk.text
    if (result.length + segment.length > charLimit) {
      const remaining = charLimit - result.length
      if (remaining > 100) {
        result += segment.substring(0, remaining)
      }
      break
    }
    result += segment
  }

  return result
}
