import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const SALT_LENGTH = 16

function getKey(salt: Buffer): Buffer {
  const config = useRuntimeConfig()
  const secret = config.firebaseAdminPrivateKey
  if (!secret) {
    throw new Error('ENCRYPTION_KEY_NOT_CONFIGURED: FIREBASE_ADMIN_PRIVATE_KEY must be set for credential encryption')
  }
  return scryptSync(secret, salt, KEY_LENGTH)
}

export function encrypt(text: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const key = getKey(salt)
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: salt:iv:authTag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')

  // Support both old format (iv:authTag:encrypted) and new format (salt:iv:authTag:encrypted)
  let salt: Buffer, iv: Buffer, authTag: Buffer, encrypted: string
  if (parts.length === 4) {
    salt = Buffer.from(parts[0], 'hex')
    iv = Buffer.from(parts[1], 'hex')
    authTag = Buffer.from(parts[2], 'hex')
    encrypted = parts[3]
  } else if (parts.length === 3) {
    // Legacy format without salt - use static salt for backward compatibility
    salt = Buffer.from('73616c74', 'hex') // 'salt' in hex
    iv = Buffer.from(parts[0], 'hex')
    authTag = Buffer.from(parts[1], 'hex')
    encrypted = parts[2]
  } else {
    throw new Error('ENCRYPTION_FORMAT_INVALID')
  }

  const key = getKey(salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
