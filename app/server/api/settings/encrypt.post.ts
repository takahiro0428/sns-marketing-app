import { encrypt } from '~/server/utils/encryption'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ value: string }>(event)

  if (!body.value) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_VALUE' })
  }

  const encryptedPassword = encrypt(body.value)
  return { encryptedPassword }
})
