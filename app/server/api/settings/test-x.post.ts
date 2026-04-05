import { getAdminFirestore } from '~/server/utils/firebase-admin'

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
  const settingsDoc = await db.collection('platformSettings').doc(`${auth.uid}_${body.projectId}`).get()

  if (!settingsDoc.exists) {
    return { success: false, error: 'Settings not found' }
  }

  const settings = settingsDoc.data()!
  const credentials = settings.xCredentials

  if (!credentials?.apiKey || !credentials?.accessToken) {
    return { success: false, error: 'X credentials not configured' }
  }

  try {
    const { createHmac, randomBytes } = await import('crypto')
    const { decrypt } = await import('~/server/utils/encryption')

    // Decrypt X credentials
    const decrypted = {
      apiKey: decrypt(credentials.apiKey),
      apiSecret: decrypt(credentials.apiSecret),
      accessToken: decrypt(credentials.accessToken),
      accessTokenSecret: decrypt(credentials.accessTokenSecret),
    }

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: decrypted.apiKey,
      oauth_nonce: randomBytes(24).toString('base64url'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: decrypted.accessToken,
      oauth_version: '1.0',
    }

    const url = 'https://api.x.com/2/users/me'
    const method = 'GET'

    const paramString = Object.keys(oauthParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
      .join('&')

    const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`
    const signingKey = `${encodeURIComponent(decrypted.apiSecret)}&${encodeURIComponent(decrypted.accessTokenSecret)}`
    const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64')

    oauthParams.oauth_signature = signature

    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ')

    await $fetch(url, {
      headers: {
        'Authorization': authHeader,
      },
    })

    return { success: true }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errMsg }
  }
})
