import { VertexAI } from '@google-cloud/vertexai'

let vertexAI: VertexAI | null = null

export function getVertexAI(): VertexAI {
  if (!vertexAI) {
    const config = useRuntimeConfig()
    const projectId = config.vertexAiProjectId || config.firebaseAdminProjectId || config.public.firebaseProjectId
    const location = config.vertexAiLocation || 'us-central1'

    vertexAI = new VertexAI({
      project: projectId,
      location,
    })
  }
  return vertexAI
}

export function getVertexAiModelName(): string {
  const config = useRuntimeConfig()
  return config.vertexAiModel || 'gemini-2.0-flash'
}

export async function generateContent(prompt: string, systemInstruction?: string): Promise<string> {
  const vertex = getVertexAI()
  const modelName = getVertexAiModelName()
  const model = vertex.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
      topP: 0.95,
    },
  })

  const contents = [{ role: 'user' as const, parts: [{ text: prompt }] }]
  const request = systemInstruction
    ? { contents, systemInstruction: { role: 'system' as const, parts: [{ text: systemInstruction }] } }
    : { contents }

  const result = await model.generateContent(request)
  const response = result.response
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text
}
