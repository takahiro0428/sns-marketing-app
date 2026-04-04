import { getAdminFirestore } from '~/server/utils/firebase-admin'

/**
 * Cascading project deletion - deletes the project and ALL child documents.
 * Collections cleaned: contentSources, distributionPlans, planChapters,
 * articles, postLogs, platformSettings, scheduleEntries
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ projectId: string }>(event)

  if (!body.projectId) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_PROJECT_ID' })
  }

  const auth = event.context.auth as { uid: string } | undefined
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED' })
  }

  const db = getAdminFirestore()

  // Verify project ownership
  const projectDoc = await db.collection('projects').doc(body.projectId).get()
  if (!projectDoc.exists) {
    throw createError({ statusCode: 404, statusMessage: 'PROJECT_NOT_FOUND' })
  }
  if (projectDoc.data()!.userId !== auth.uid) {
    throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  }

  // Delete all child collections in batches
  const childCollections = [
    'contentSources',
    'distributionPlans',
    'planChapters',
    'articles',
    'postLogs',
    'platformSettings',
    'scheduleEntries',
  ]

  for (const collectionName of childCollections) {
    const query = db.collection(collectionName)
      .where('projectId', '==', body.projectId)
      .limit(500)

    let snapshot = await query.get()
    while (!snapshot.empty) {
      const batch = db.batch()
      snapshot.docs.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
      snapshot = await query.get()
    }
  }

  // Delete the project document itself
  await db.collection('projects').doc(body.projectId).delete()

  return { success: true }
})
