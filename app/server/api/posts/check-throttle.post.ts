import { getAdminFirestore } from '~/server/utils/firebase-admin'
import { fetchAndCheckThrottle } from '~/server/utils/anti-ban'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ projectId: string; platform: 'note' | 'x' }>(event)

  if (!body.projectId || !body.platform) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_REQUIRED_FIELDS' })
  }

  const db = getAdminFirestore()
  return await fetchAndCheckThrottle(db, body.projectId, body.platform)
})
