import { getAdminFirestore } from '~/server/utils/firebase-admin'
import { fetchAndCheckThrottle } from '~/server/utils/anti-ban'
import { postToNote, postToX } from '~/server/utils/posting'

interface PublishRequest {
  articleId: string
  projectId: string
  platform: 'note' | 'x'
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PublishRequest>(event)

  if (!body.articleId || !body.projectId || !body.platform) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_REQUIRED_FIELDS' })
  }

  const db = getAdminFirestore()

  // Fetch article
  const articleDoc = await db.collection('articles').doc(body.articleId).get()
  if (!articleDoc.exists) {
    throw createError({ statusCode: 404, statusMessage: 'ARTICLE_NOT_FOUND' })
  }
  const article = articleDoc.data()!

  // Fetch platform settings
  const settingsQuery = await db.collection('platformSettings')
    .where('projectId', '==', body.projectId)
    .limit(1)
    .get()

  if (settingsQuery.empty) {
    throw createError({ statusCode: 400, statusMessage: 'PLATFORM_SETTINGS_NOT_CONFIGURED' })
  }
  const settings = settingsQuery.docs[0].data()

  // Check throttle / anti-BAN
  const throttleResult = await fetchAndCheckThrottle(db, body.projectId, body.platform)

  if (!throttleResult.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'RATE_LIMITED',
      data: {
        reason: throttleResult.reason,
        nextAllowedAt: throttleResult.nextAllowedAt?.toISOString(),
        remainingToday: throttleResult.remainingToday,
        remainingThisWeek: throttleResult.remainingThisWeek,
      },
    })
  }

  // Post to platform
  if (body.platform === 'note') {
    return await postToNote(article, settings)
  } else {
    return await postToX(article, settings)
  }
})
