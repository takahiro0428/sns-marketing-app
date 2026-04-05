import { getAdminFirestore } from '~/server/utils/firebase-admin'
import { fetchAndCheckThrottle } from '~/server/utils/anti-ban'

/**
 * Scheduler processor - called periodically to process pending scheduled posts
 * This should be triggered by a Cloud Scheduler or cron job
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ apiKey?: string }>(event)

  // Scheduler API key auth - uses dedicated header
  const schedulerKey = getHeader(event, 'x-scheduler-key')
  const config = useRuntimeConfig()
  const expectedKey = config.schedulerApiKey
  if (!expectedKey) {
    throw createError({ statusCode: 500, statusMessage: 'SCHEDULER_KEY_NOT_CONFIGURED' })
  }
  if (schedulerKey !== expectedKey) {
    throw createError({ statusCode: 401, statusMessage: 'UNAUTHORIZED' })
  }

  const db = getAdminFirestore()
  const now = new Date()

  // Find active schedules that are due
  const schedulesQuery = await db.collection('scheduleEntries')
    .where('status', '==', 'active')
    .where('scheduledAt', '<=', now)
    .orderBy('scheduledAt', 'asc')
    .limit(10) // Process max 10 at a time
    .get()

  if (schedulesQuery.empty) {
    return { processed: 0, message: 'No pending schedules' }
  }

  const results: Array<{ scheduleId: string; status: string; error?: string }> = []

  for (const scheduleDoc of schedulesQuery.docs) {
    const schedule = scheduleDoc.data()

    try {
      // Skip entries without userId (data integrity guard)
      if (!schedule.userId) {
        await scheduleDoc.ref.update({ status: 'paused' })
        results.push({ scheduleId: scheduleDoc.id, status: 'failed', error: 'Missing userId' })
        continue
      }

      // Check throttle before posting
      const throttleResult = await fetchAndCheckThrottle(db, schedule.projectId, schedule.platform)

      if (!throttleResult.allowed) {
        results.push({
          scheduleId: scheduleDoc.id,
          status: 'throttled',
          error: throttleResult.reason,
        })
        continue // Don't mark as completed, will retry next time
      }

      // Directly post to platform (avoid internal HTTP call)
      const articleDoc = await db.collection('articles').doc(schedule.articleId).get()
      if (!articleDoc.exists) {
        await scheduleDoc.ref.update({ status: 'paused' })
        results.push({ scheduleId: scheduleDoc.id, status: 'failed', error: 'Article not found' })
        continue
      }

      // Fetch platform settings using composite ID (consistent with client-side)
      const settingsDoc = await db.collection('platformSettings')
        .doc(`${schedule.userId}_${schedule.projectId}`).get()

      if (!settingsDoc.exists) {
        await scheduleDoc.ref.update({ status: 'paused' })
        results.push({ scheduleId: scheduleDoc.id, status: 'failed', error: 'Platform settings not found' })
        continue
      }

      // Import and call the publish functions directly
      const { postToNote, postToX } = await import('~/server/utils/posting')
      const article = articleDoc.data()!
      const platformSettings = settingsDoc.data()!

      let postResult
      if (schedule.platform === 'note') {
        postResult = await postToNote(article, platformSettings)
      } else {
        postResult = await postToX(article, platformSettings)
      }

      // Log success
      await db.collection('postLogs').add({
        projectId: schedule.projectId,
        userId: schedule.userId,
        articleId: schedule.articleId,
        platform: schedule.platform,
        status: 'success',
        externalPostId: postResult.postId,
        externalPostUrl: postResult.postUrl,
        retryCount: 0,
        postedAt: new Date(),
        createdAt: new Date(),
      })

      // Update article post status
      const articleUpdateData: Record<string, unknown> = { updatedAt: new Date() }
      if (schedule.platform === 'note') {
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
      await db.collection('articles').doc(schedule.articleId).update(articleUpdateData)

      // Mark schedule as completed
      await scheduleDoc.ref.update({ status: 'completed' })
      results.push({ scheduleId: scheduleDoc.id, status: 'success' })
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      // Mark permanently failing entries as paused to prevent infinite retry
      try {
        await scheduleDoc.ref.update({ status: 'paused' })
      } catch {
        // Non-blocking: if status update fails, entry will be retried next cycle
      }
      results.push({ scheduleId: scheduleDoc.id, status: 'failed', error: errMsg })
    }
  }

  return {
    processed: results.length,
    results,
  }
})
