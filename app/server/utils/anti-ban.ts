/**
 * Anti-BAN Strategy for SNS Posting
 *
 * Implements multiple layers of protection against account bans:
 * 1. Rate limiting per platform
 * 2. Human-like posting patterns (random intervals)
 * 3. Content variation detection
 * 4. Daily/Weekly/Monthly caps
 * 5. Active hours enforcement
 */

export interface ThrottleConfig {
  dailyLimit: number
  weeklyLimit: number
  monthlyLimit: number
  minIntervalMinutes: number
  maxIntervalMinutes: number
  activeHoursStart: number // 0-23
  activeHoursEnd: number   // 0-23
}

export const DEFAULT_NOTE_THROTTLE: ThrottleConfig = {
  dailyLimit: 3,        // Conservative for free accounts
  weeklyLimit: 15,
  monthlyLimit: 50,
  minIntervalMinutes: 120,  // At least 2 hours between posts
  maxIntervalMinutes: 480,  // Up to 8 hours
  activeHoursStart: 8,
  activeHoursEnd: 22,
}

export const DEFAULT_X_THROTTLE: ThrottleConfig = {
  dailyLimit: 5,
  weeklyLimit: 25,
  monthlyLimit: 80,
  minIntervalMinutes: 60,   // At least 1 hour between posts
  maxIntervalMinutes: 240,  // Up to 4 hours
  activeHoursStart: 7,
  activeHoursEnd: 23,
}

export interface ThrottleCheckResult {
  allowed: boolean
  reason?: string
  nextAllowedAt?: Date
  remainingToday: number
  remainingThisWeek: number
}

export function checkThrottle(
  lastPostedAt: Date | null,
  postsToday: number,
  postsThisWeek: number,
  postsThisMonth: number,
  config: ThrottleConfig,
): ThrottleCheckResult {
  const now = new Date()
  const currentHour = now.getHours()

  // Check active hours
  if (currentHour < config.activeHoursStart || currentHour >= config.activeHoursEnd) {
    const nextStart = new Date(now)
    if (currentHour >= config.activeHoursEnd) {
      nextStart.setDate(nextStart.getDate() + 1)
    }
    nextStart.setHours(config.activeHoursStart, 0, 0, 0)
    return {
      allowed: false,
      reason: `Outside active hours (${config.activeHoursStart}:00 - ${config.activeHoursEnd}:00)`,
      nextAllowedAt: nextStart,
      remainingToday: Math.max(0, config.dailyLimit - postsToday),
      remainingThisWeek: Math.max(0, config.weeklyLimit - postsThisWeek),
    }
  }

  // Check daily limit
  if (postsToday >= config.dailyLimit) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(config.activeHoursStart, 0, 0, 0)
    return {
      allowed: false,
      reason: `Daily limit reached (${config.dailyLimit} posts/day)`,
      nextAllowedAt: tomorrow,
      remainingToday: 0,
      remainingThisWeek: Math.max(0, config.weeklyLimit - postsThisWeek),
    }
  }

  // Check weekly limit
  if (postsThisWeek >= config.weeklyLimit) {
    return {
      allowed: false,
      reason: `Weekly limit reached (${config.weeklyLimit} posts/week)`,
      remainingToday: 0,
      remainingThisWeek: 0,
    }
  }

  // Check monthly limit
  if (postsThisMonth >= config.monthlyLimit) {
    return {
      allowed: false,
      reason: `Monthly limit reached (${config.monthlyLimit} posts/month)`,
      remainingToday: 0,
      remainingThisWeek: 0,
    }
  }

  // Check minimum interval
  if (lastPostedAt) {
    const elapsed = (now.getTime() - lastPostedAt.getTime()) / (1000 * 60)
    if (elapsed < config.minIntervalMinutes) {
      const nextAllowed = new Date(lastPostedAt.getTime() + config.minIntervalMinutes * 60 * 1000)
      return {
        allowed: false,
        reason: `Minimum interval not met (${config.minIntervalMinutes} min between posts, ${Math.ceil(config.minIntervalMinutes - elapsed)} min remaining)`,
        nextAllowedAt: nextAllowed,
        remainingToday: Math.max(0, config.dailyLimit - postsToday),
        remainingThisWeek: Math.max(0, config.weeklyLimit - postsThisWeek),
      }
    }
  }

  return {
    allowed: true,
    remainingToday: Math.max(0, config.dailyLimit - postsToday),
    remainingThisWeek: Math.max(0, config.weeklyLimit - postsThisWeek),
  }
}

/**
 * Generate human-like random delay in milliseconds
 * Uses gaussian-like distribution for natural variation
 */
export function getHumanDelay(minMinutes: number, maxMinutes: number): number {
  // Box-Muller transform for gaussian distribution
  const u1 = Math.random()
  const u2 = Math.random()
  const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)

  // Map to range with center bias
  const center = (minMinutes + maxMinutes) / 2
  const spread = (maxMinutes - minMinutes) / 4
  let delay = center + gaussian * spread

  // Clamp to range
  delay = Math.max(minMinutes, Math.min(maxMinutes, delay))

  return Math.round(delay * 60 * 1000) // Convert to ms
}

/**
 * Fetch post logs from Firestore and check throttle in one call.
 * Eliminates code duplication across publish, check-throttle, and scheduler endpoints.
 */
export async function fetchAndCheckThrottle(
  db: FirebaseFirestore.Firestore,
  projectId: string,
  platform: 'note' | 'x',
): Promise<ThrottleCheckResult & {
  postsToday: number
  postsThisWeek: number
  postsThisMonth: number
  limits: ThrottleConfig
}> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Only fetch logs from this month (optimization: avoid loading all-time history)
  const logsQuery = await db.collection('postLogs')
    .where('projectId', '==', projectId)
    .where('platform', '==', platform)
    .where('status', '==', 'success')
    .where('postedAt', '>=', monthStart)
    .orderBy('postedAt', 'desc')
    .get()

  const allLogs = logsQuery.docs.map((d) => d.data())
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const lastPostedAt = allLogs.length > 0 && allLogs[0].postedAt
    ? allLogs[0].postedAt.toDate()
    : null
  const postsToday = allLogs.filter((l) => l.postedAt && l.postedAt.toDate() >= todayStart).length
  const postsThisWeek = allLogs.filter((l) => l.postedAt && l.postedAt.toDate() >= weekStart).length
  const postsThisMonth = allLogs.length

  const config = platform === 'note' ? DEFAULT_NOTE_THROTTLE : DEFAULT_X_THROTTLE
  const result = checkThrottle(lastPostedAt, postsToday, postsThisWeek, postsThisMonth, config)

  return {
    ...result,
    postsToday,
    postsThisWeek,
    postsThisMonth,
    limits: config,
  }
}
