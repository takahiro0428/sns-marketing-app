import { getAdminFirestore } from '~/server/utils/firebase-admin'
import { fetchAndCheckThrottle } from '~/server/utils/anti-ban'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ projectId: string; platform: 'note' | 'x' }>(event)

  if (!body.projectId || !body.platform) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_REQUIRED_FIELDS' })
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

  return await fetchAndCheckThrottle(db, body.projectId, body.platform)
})
