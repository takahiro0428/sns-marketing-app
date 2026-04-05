import { getAdminApp } from '~/server/utils/firebase-admin'
import { getAuth } from 'firebase-admin/auth'

/**
 * Server middleware to verify Firebase Auth ID tokens.
 * Protects all /api/ routes except scheduler (which uses its own auth).
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  // Skip auth for non-API routes
  if (!path.startsWith('/api/')) return

  // Scheduler supports both scheduler key and user auth.
  // If no Authorization header is provided, skip (scheduler key will be checked in handler).
  if (path.startsWith('/api/scheduler/')) {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) return
    // If Bearer token present, validate it and attach auth context (fall through)
  }

  // Extract Bearer token
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'AUTH_TOKEN_REQUIRED',
    })
  }

  const idToken = authHeader.substring(7)

  try {
    const app = getAdminApp()
    const auth = getAuth(app)
    const decodedToken = await auth.verifyIdToken(idToken)

    // Attach user info to event context for use in API handlers
    event.context.auth = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
    }
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'AUTH_TOKEN_INVALID',
    })
  }
})
