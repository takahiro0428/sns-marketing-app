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
  const auth = event.context.auth as { uid: string } | undefined
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED' })
  }

  // Fetch article
  const articleDoc = await db.collection('articles').doc(body.articleId).get()
  if (!articleDoc.exists) {
    throw createError({ statusCode: 404, statusMessage: 'ARTICLE_NOT_FOUND' })
  }
  const article = articleDoc.data()!

  // Verify article ownership
  if (article.userId !== auth.uid) {
    throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  }

  // Fetch platform settings using composite ID (consistent with client-side)
  const settingsDoc = await db.collection('platformSettings').doc(`${auth.uid}_${body.projectId}`).get()

  if (!settingsDoc.exists) {
    throw createError({ statusCode: 400, statusMessage: 'PLATFORM_SETTINGS_NOT_CONFIGURED' })
  }
  const settings = settingsDoc.data()!

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
  let postResult: { postId: string; postUrl: string }
  try {
    if (body.platform === 'note') {
      postResult = await postToNote(article, settings)
    } else {
      postResult = await postToX(article, settings)
    }
  } catch (error: unknown) {
    // Create failed post log server-side
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    await db.collection('postLogs').add({
      projectId: body.projectId,
      userId: auth.uid,
      articleId: body.articleId,
      platform: body.platform,
      status: 'failed',
      errorMessage: errMsg,
      retryCount: 0,
      createdAt: new Date(),
    })
    throw error
  }

  // Create success post log server-side (ensures scheduler posts are also logged)
  await db.collection('postLogs').add({
    projectId: body.projectId,
    userId: auth.uid,
    articleId: body.articleId,
    platform: body.platform,
    status: 'success',
    externalPostId: postResult.postId,
    externalPostUrl: postResult.postUrl,
    retryCount: 0,
    postedAt: new Date(),
    createdAt: new Date(),
  })

  // Update article post status
  const articleUpdateData: Record<string, unknown> = { updatedAt: new Date() }
  if (body.platform === 'note') {
    articleUpdateData.notePostId = postResult.postId
    articleUpdateData.notePostUrl = postResult.postUrl
    articleUpdateData.notePostedAt = new Date()
    articleUpdateData.status = article.xPostId ? 'posted_all' : 'posted_note'
  } else {
    articleUpdateData.xPostId = postResult.postId
    articleUpdateData.xPostUrl = postResult.postUrl
    articleUpdateData.xPostedAt = new Date()
    articleUpdateData.status = article.notePostId ? 'posted_all' : 'posted_x'
  }
  await db.collection('articles').doc(body.articleId).update(articleUpdateData)

  return postResult
})
