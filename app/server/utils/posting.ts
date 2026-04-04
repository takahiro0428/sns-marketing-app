import { decrypt } from '~/server/utils/encryption'
import { createHmac, randomBytes } from 'crypto'

export async function postToNote(
  article: Record<string, unknown>,
  settings: Record<string, unknown>,
): Promise<{ postId: string; postUrl: string }> {
  const credentials = settings.noteCredentials as Record<string, string> | undefined
  if (!credentials?.email) {
    throw new Error('NOTE_CREDENTIALS_NOT_SET')
  }

  const config = useRuntimeConfig()
  const baseUrl = config.noteApiEndpoint || 'https://note.com/api'

  // Step 1: Login to get session token
  let sessionToken = settings.noteSessionToken as string | undefined

  if (!sessionToken) {
    const decryptedPassword = decrypt(credentials.password)

    const loginResponse = await $fetch<{ data: { accessToken: string } }>(`${baseUrl}/v1/sessions/sign_in`, {
      method: 'POST',
      body: {
        login: credentials.email,
        password: decryptedPassword,
      },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    sessionToken = loginResponse.data.accessToken
  }

  // Step 2: Create note post
  const postResponse = await $fetch<{
    data: { id: number; key: string; user: { urlname: string } }
  }>(`${baseUrl}/v3/notes`, {
    method: 'POST',
    body: {
      name: article.title,
      body: article.body,
      status: 'published',
      free: true,
      can_reprint: false,
      tags: (article.tags as string[]) || [],
    },
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  const noteData = postResponse.data
  const postUrl = `https://note.com/${noteData.user.urlname}/n/${noteData.key}`

  return {
    postId: String(noteData.id),
    postUrl,
  }
}

export async function postToX(
  article: Record<string, unknown>,
  settings: Record<string, unknown>,
): Promise<{ postId: string; postUrl: string }> {
  const encCredentials = settings.xCredentials as Record<string, string> | undefined
  if (!encCredentials?.apiKey) {
    throw new Error('X_CREDENTIALS_NOT_SET')
  }

  // Decrypt X credentials
  const credentials = {
    apiKey: decrypt(encCredentials.apiKey),
    apiSecret: decrypt(encCredentials.apiSecret),
    accessToken: decrypt(encCredentials.accessToken),
    accessTokenSecret: decrypt(encCredentials.accessTokenSecret),
  }

  // Build tweet text from article summary
  let tweetText = (article.summary || article.title) as string
  if (article.notePostUrl) {
    tweetText += `\n\n${article.notePostUrl}`
  }

  // Enforce X character limit (280 chars)
  if (tweetText.length > 280) {
    tweetText = tweetText.substring(0, 277) + '...'
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  }

  const url = 'https://api.x.com/2/tweets'
  const method = 'POST'

  // Generate signature
  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&')

  const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`
  const signingKey = `${encodeURIComponent(credentials.apiSecret)}&${encodeURIComponent(credentials.accessTokenSecret)}`
  const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64')

  oauthParams.oauth_signature = signature

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ')

  const response = await $fetch<{
    data: { id: string; text: string }
  }>(url, {
    method: 'POST',
    body: { text: tweetText },
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'User-Agent': 'SNSMarketingApp/1.0',
    },
  })

  return {
    postId: response.data.id,
    postUrl: `https://x.com/i/status/${response.data.id}`,
  }
}

function generateNonce(): string {
  return randomBytes(24).toString('base64url')
}
