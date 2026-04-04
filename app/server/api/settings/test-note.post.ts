import { getAdminFirestore } from '~/server/utils/firebase-admin'
import { decrypt } from '~/server/utils/encryption'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ projectId: string }>(event)

  if (!body.projectId) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_PROJECT_ID' })
  }

  const db = getAdminFirestore()
  const settingsQuery = await db.collection('platformSettings')
    .where('projectId', '==', body.projectId)
    .limit(1)
    .get()

  if (settingsQuery.empty) {
    return { success: false, error: 'Settings not found' }
  }

  const settings = settingsQuery.docs[0].data()
  const credentials = settings.noteCredentials

  if (!credentials?.email || !credentials?.password) {
    return { success: false, error: 'Note credentials not configured' }
  }

  try {
    const config = useRuntimeConfig()
    const baseUrl = config.noteApiEndpoint || 'https://note.com/api'
    const decryptedPassword = decrypt(credentials.password)

    const response = await $fetch<{ data: { accessToken: string } }>(`${baseUrl}/v1/sessions/sign_in`, {
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

    // Save session token
    if (response.data?.accessToken) {
      const settingsRef = settingsQuery.docs[0].ref
      await settingsRef.update({
        noteSessionToken: response.data.accessToken,
        updatedAt: new Date(),
      })
    }

    return { success: true }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errMsg }
  }
})
