import { generateContent } from '~/server/utils/vertex-ai'
import { getAdminFirestore } from '~/server/utils/firebase-admin'

interface GenerateRequest {
  projectId: string
  contentSourceId: string
  suggestedChapters?: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<GenerateRequest>(event)

  if (!body.projectId || !body.contentSourceId) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_REQUIRED_FIELDS' })
  }

  const auth = event.context.auth as { uid: string } | undefined
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED' })
  }

  const db = getAdminFirestore()

  // Fetch content source
  const contentDoc = await db.collection('contentSources').doc(body.contentSourceId).get()
  if (!contentDoc.exists) {
    throw createError({ statusCode: 404, statusMessage: 'CONTENT_SOURCE_NOT_FOUND' })
  }

  const content = contentDoc.data()!

  // Verify content source ownership
  if (content.userId !== auth.uid) {
    throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  }
  const rawText = content.rawText || ''

  if (!rawText.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'CONTENT_SOURCE_EMPTY' })
  }

  const chapterHint = body.suggestedChapters
    ? `ユーザーは約${body.suggestedChapters}章を希望しています。`
    : '最適な章数を提案してください（3〜15章程度）。'

  const systemInstruction = `あなたはSNSマーケティングの配信計画を立てるプロフェッショナルです。
提供されたコンテンツを分析し、noteとXでの連載投稿に最適な配信計画を提案してください。

以下のルールに従ってください：
- 各章は独立して読んでも価値がある内容にする
- SNSでの拡散を意識したキャッチーなタイトルをつける
- 読者の関心を引き続けるストーリー構成にする
- noteの記事として適切な文量（1章あたり1500-3000文字目安）になるよう分割する
- 最初の章は特に引きの強い内容にする

回答は必ず以下のJSON形式で返してください（他の文字は含めないでください）：
{
  "title": "連載全体のタイトル",
  "totalChapters": 数値,
  "aiRationale": "この分割にした理由の説明",
  "chapters": [
    {
      "title": "第1章のタイトル",
      "synopsis": "この章で扱う内容の概要（100-200文字）"
    }
  ]
}`

  const prompt = `以下のコンテンツを分析し、SNS連載投稿の配信計画を作成してください。

${chapterHint}

=== コンテンツ ===
${rawText.substring(0, 30000)}
=== コンテンツここまで ===`

  const response = await generateContent(prompt, systemInstruction)

  // Parse JSON from response
  let parsed
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, response]
    const jsonStr = jsonMatch[1]!.trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'AI_RESPONSE_PARSE_ERROR',
      data: { rawResponse: response.substring(0, 500) },
    })
  }

  return {
    plan: {
      title: parsed.title,
      totalChapters: parsed.totalChapters,
      aiRationale: parsed.aiRationale,
    },
    chapters: parsed.chapters,
  }
})
