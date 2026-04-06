import { decrypt, encrypt } from '~/server/utils/encryption'
import { getAdminFirestore } from '~/server/utils/firebase-admin'
import { createHmac, randomBytes } from 'crypto'

export async function postToNote(
  article: Record<string, unknown>,
  settings: Record<string, unknown>,
  settingsDocPath?: string,
): Promise<{ postId: string; postUrl: string }> {
  const credentials = settings.noteCredentials as Record<string, string> | undefined
  if (!credentials?.email) {
    throw new Error('NOTE_CREDENTIALS_NOT_SET')
  }

  const config = useRuntimeConfig()
  const baseUrl = config.noteApiEndpoint || 'https://note.com/api'

  // Step 1: Login to get session cookies
  // note.com uses cookie-based authentication (Set-Cookie headers), not Bearer tokens
  let sessionCookies: string | undefined
  const encryptedCookies = settings.noteSessionToken as string | undefined
  if (encryptedCookies) {
    try {
      sessionCookies = decrypt(encryptedCookies)
    } catch {
      // Stored value may be a stale Bearer token from before migration; ignore and re-login
      sessionCookies = undefined
    }
  }

  let loginUrlname: string | undefined

  const saveSessionData = async (cookies: string) => {
    if (!settingsDocPath) return
    try {
      const db = getAdminFirestore()
      const updateData: Record<string, unknown> = {
        noteSessionToken: encrypt(cookies),
        updatedAt: new Date(),
      }
      if (loginUrlname) {
        updateData.noteUrlname = loginUrlname
      }
      await db.doc(settingsDocPath).update(updateData)
    } catch {
      // Non-blocking: session save failure should not stop the post
    }
  }

  const loginToNote = async (): Promise<string> => {
    const decryptedPassword = decrypt(credentials.password)
    try {
      const loginResponse = await $fetch.raw(`${baseUrl}/v1/sessions/sign_in`, {
        method: 'POST',
        body: {
          login: credentials.email,
          password: decryptedPassword,
        },
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'manual',
      })

      // note.com returns auth info via Set-Cookie headers, not in response body
      const setCookies = loginResponse.headers.getSetCookie()
      if (!setCookies || setCookies.length === 0) {
        throw new Error('NOTE_LOGIN_ERROR: セッションCookieを取得できませんでした')
      }

      // Build cookie string: extract "name=value" from each Set-Cookie header
      const cookieString = setCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ')
      if (!cookieString) {
        throw new Error('NOTE_LOGIN_ERROR: セッションCookieを取得できませんでした')
      }

      // Extract urlname from login response for post URL construction fallback
      const loginData = loginResponse._data as { data?: { urlname?: string } } | undefined
      if (loginData?.data?.urlname) {
        loginUrlname = loginData.data.urlname
      }

      return cookieString
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith('NOTE_')) {
        throw error
      }
      const statusCode = (error as { statusCode?: number })?.statusCode
      if (statusCode === 401 || statusCode === 403) {
        throw new Error('NOTE_LOGIN_FAILED: メールアドレスまたはパスワードが正しくありません')
      }
      throw new Error(`NOTE_LOGIN_ERROR: Noteへのログインに失敗しました (${statusCode || 'ネットワークエラー'})`)
    }
  }

  if (!sessionCookies) {
    sessionCookies = await loginToNote()
    await saveSessionData(sessionCookies)
  }

  // Step 2: Create note post (with session cookie retry)
  // note.com uses /v1/text_notes for article creation with Cookie-based auth
  const postNote = async (cookies: string) => {
    return await $fetch.raw(`${baseUrl}/v1/text_notes`, {
      method: 'POST',
      body: {
        name: article.title,
        body: article.body,
        status: 'draft',
        free: true,
        can_reprint: false,
        tags: (article.tags as string[]) || [],
      },
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
  }

  let postResponse: Awaited<ReturnType<typeof postNote>>
  try {
    postResponse = await postNote(sessionCookies)
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode
    // If 401, session cookies may have expired — retry with fresh login
    if (statusCode === 401) {
      sessionCookies = await loginToNote()
      await saveSessionData(sessionCookies)
      try {
        postResponse = await postNote(sessionCookies)
      } catch (retryError: unknown) {
        const retryStatus = (retryError as { statusCode?: number })?.statusCode
        throw new Error(`NOTE_POST_FAILED: 記事の投稿に失敗しました (${retryStatus || 'エラー'})`)
      }
    } else {
      throw new Error(`NOTE_POST_FAILED: 記事の投稿に失敗しました (${statusCode || 'ネットワークエラー'})`)
    }
  }

  // Parse response — handle both nested ({ data: { ... } }) and flat ({ id, key, ... }) structures
  const responseBody = postResponse._data as Record<string, unknown> | undefined
  const noteObj = (responseBody?.data ?? responseBody) as
    { id?: number; key?: string; note_url?: string; user?: { urlname?: string } } | undefined

  if (!noteObj?.id || !noteObj?.key) {
    const detail = responseBody ? JSON.stringify(responseBody).substring(0, 200) : 'empty response'
    throw new Error(`NOTE_POST_FAILED: 予期しないレスポンス形式です (${detail})`)
  }

  // Step 3: Publish the draft
  // POST /api/v1/text_notes only creates a draft. A separate publish call is required.
  const publishNote = async (cookies: string) => {
    return await $fetch.raw(`${baseUrl}/v2/notes/${noteObj!.key}/publish`, {
      method: 'PUT',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
  }

  let publishResponse: Awaited<ReturnType<typeof publishNote>>
  try {
    publishResponse = await publishNote(sessionCookies)
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode
    // If 401, session cookies may have expired — retry with fresh login
    if (statusCode === 401) {
      sessionCookies = await loginToNote()
      await saveSessionData(sessionCookies)
      try {
        publishResponse = await publishNote(sessionCookies)
      } catch (retryError: unknown) {
        const retryStatus = (retryError as { statusCode?: number })?.statusCode
        throw new Error(`NOTE_PUBLISH_FAILED: 記事の公開に失敗しました (${retryStatus || 'エラー'})`)
      }
    } else {
      throw new Error(`NOTE_PUBLISH_FAILED: 記事の公開に失敗しました (${statusCode || 'ネットワークエラー'})`)
    }
  }

  // Try to extract canonical URL or urlname from publish response
  const publishBody = publishResponse!._data as Record<string, unknown> | undefined
  const publishData = (publishBody?.data ?? publishBody) as
    { note_url?: string; user?: { urlname?: string } } | undefined

  // Resolve urlname: publish response > post response > login response > settings
  const urlname = publishData?.user?.urlname
    || noteObj.user?.urlname
    || loginUrlname
    || (settings.noteUrlname as string | undefined)

  let postUrl: string
  if (publishData?.note_url) {
    postUrl = publishData.note_url
  } else if (noteObj.note_url) {
    postUrl = noteObj.note_url
  } else if (urlname) {
    postUrl = `https://note.com/${urlname}/n/${noteObj.key}`
  } else {
    // urlname unavailable — construct best-effort URL using the key.
    // The article is already published at this point, so throwing would orphan it.
    postUrl = `https://note.com/n/${noteObj.key}`
  }

  return {
    postId: String(noteObj.id),
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
