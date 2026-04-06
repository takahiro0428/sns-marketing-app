import { getAdminFirestore } from '~/server/utils/firebase-admin'
import { decrypt, encrypt } from '~/server/utils/encryption'

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
  const credentials = settings.noteCredentials

  if (!credentials?.email || !credentials?.password) {
    return { success: false, error: 'Note credentials not configured' }
  }

  try {
    const config = useRuntimeConfig()
    const baseUrl = config.noteApiEndpoint || 'https://note.com/api'
    const decryptedPassword = decrypt(credentials.password)

    // note.com uses cookie-based auth: session info is in Set-Cookie headers, not response body
    const response = await $fetch.raw(`${baseUrl}/v1/sessions/sign_in`, {
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

    // Extract session cookies from Set-Cookie response headers
    const setCookies = response.headers.getSetCookie()

    if (!setCookies || setCookies.length === 0) {
      return { success: false, error: 'ログインは成功しましたが、セッションCookieを取得できませんでした' }
    }

    // Build cookie string: extract "name=value" from each Set-Cookie header
    const cookieString = setCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ')
    if (!cookieString) {
      return { success: false, error: 'ログインは成功しましたが、セッションCookieを取得できませんでした' }
    }

    // Extract urlname from login response for post URL construction
    const loginData = response._data as { data?: { urlname?: string } } | undefined
    const noteUrlname = loginData?.data?.urlname

    // Save session cookies and urlname (encrypted at rest, consistent with password storage)
    const settingsRef = settingsDoc.ref
    const updateData: Record<string, unknown> = {
      noteSessionToken: encrypt(cookieString),
      updatedAt: new Date(),
    }
    if (noteUrlname) {
      updateData.noteUrlname = noteUrlname
    }
    await settingsRef.update(updateData)

    return { success: true }
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode
    if (statusCode === 401 || statusCode === 403) {
      return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' }
    }
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errMsg }
  }
})
