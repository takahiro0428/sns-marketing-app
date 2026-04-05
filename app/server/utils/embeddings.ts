import { GoogleAuth } from 'google-auth-library'

let authClient: GoogleAuth | null = null

function getAuthClient(): GoogleAuth {
  if (!authClient) {
    const config = useRuntimeConfig()
    const credentials = config.firebaseAdminPrivateKey && config.firebaseAdminClientEmail
      ? {
          credentials: {
            client_email: config.firebaseAdminClientEmail,
            private_key: config.firebaseAdminPrivateKey.replace(/\\n/g, '\n'),
          },
        }
      : {}
    authClient = new GoogleAuth({
      ...credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })
  }
  return authClient
}

/**
 * Split text into chunks with overlap, preferring paragraph boundaries.
 */
export function chunkText(text: string, chunkSize = 800, overlap = 200): string[] {
  if (!text || text.trim().length === 0) return []

  const trimmed = text.trim()
  if (trimmed.length <= chunkSize) return [trimmed]

  const paragraphs = trimmed.split(/\n\s*\n/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    const paragraph = para.trim()
    if (!paragraph) continue

    if (current.length + paragraph.length + 1 <= chunkSize) {
      current = current ? `${current}\n\n${paragraph}` : paragraph
    } else {
      if (current) {
        chunks.push(current)
        // Keep overlap from the end of the current chunk
        const overlapText = current.slice(-overlap)
        current = overlapText + '\n\n' + paragraph
      } else {
        // Single paragraph exceeds chunkSize — split by sentences
        current = paragraph
      }

      // If current still exceeds chunkSize, force split
      while (current.length > chunkSize) {
        const splitAt = findSplitPoint(current, chunkSize)
        chunks.push(current.slice(0, splitAt).trim())
        const overlapStart = Math.max(0, splitAt - overlap)
        current = current.slice(overlapStart).trim()
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks
}

function findSplitPoint(text: string, maxLen: number): number {
  // Try to split at sentence boundary
  const sentenceEnd = text.lastIndexOf('。', maxLen)
  if (sentenceEnd > maxLen * 0.5) return sentenceEnd + 1

  const periodEnd = text.lastIndexOf('. ', maxLen)
  if (periodEnd > maxLen * 0.5) return periodEnd + 2

  // Fall back to newline
  const newlineEnd = text.lastIndexOf('\n', maxLen)
  if (newlineEnd > maxLen * 0.5) return newlineEnd + 1

  // Last resort: split at maxLen
  return maxLen
}

/**
 * Generate embeddings for an array of texts using Vertex AI text-embedding-005.
 * Returns an array of 768-dimensional vectors.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const config = useRuntimeConfig()
  const projectId = config.vertexAiProjectId || config.firebaseAdminProjectId || config.public.firebaseProjectId
  const location = config.vertexAiLocation || 'asia-northeast1'
  const model = 'text-embedding-005'

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`

  const auth = getAuthClient()
  const client = await auth.getClient()
  const accessToken = await client.getAccessToken()

  const results: number[][] = []
  const batchSize = 250

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const instances = batch.map((text) => ({
      content: text.substring(0, 10000), // API limit per instance
    }))

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances,
        parameters: { outputDimensionality: 768 },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Embedding API error (${response.status}): ${errorText}`)
    }

    const data = await response.json() as {
      predictions: Array<{ embeddings: { values: number[] } }>
    }

    for (const prediction of data.predictions) {
      results.push(prediction.embeddings.values)
    }
  }

  return results
}
