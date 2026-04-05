import { generateContent } from '~/server/utils/vertex-ai'
import { getAdminFirestore } from '~/server/utils/firebase-admin'
import { retrieveRelevantContent } from '~/server/utils/content-retrieval'

interface GenerateRequest {
  projectId: string
  chapterId: string
  planId: string
  chapterTitle: string
  chapterSynopsis: string
  userRequirements?: string
  tone?: string
  style?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<GenerateRequest>(event)

  if (!body.projectId || !body.chapterId) {
    throw createError({ statusCode: 400, statusMessage: 'MISSING_REQUIRED_FIELDS' })
  }

  const auth = event.context.auth as { uid: string } | undefined
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED' })
  }

  const db = getAdminFirestore()

  // Verify project ownership
  const projectDoc = await db.collection('projects').doc(body.projectId).get()
  if (!projectDoc.exists || projectDoc.data()!.userId !== auth.uid) {
    throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  }

  // Fetch other chapters in the plan for context
  let otherChapters: string[] = []
  if (body.planId) {
    const chaptersSnap = await db.collection('planChapters')
      .where('planId', '==', body.planId)
      .where('userId', '==', auth.uid)
      .orderBy('chapterNumber', 'asc')
      .get()
    otherChapters = chaptersSnap.docs.map((d) => {
      const data = d.data()
      return `第${data.chapterNumber}章: ${data.title} - ${data.synopsis}`
    })
  }

  // Build search query from chapter context + user requirements
  const searchQuery = [
    body.chapterTitle,
    body.chapterSynopsis,
    body.userRequirements,
  ].filter(Boolean).join(' ')

  // Retrieve relevant content from all project documents via RAG
  const contentText = await retrieveRelevantContent(
    body.projectId,
    auth.uid,
    searchQuery,
    20000,
  )

  const tone = body.tone || '親しみやすく専門的'
  const style = body.style || 'note記事向け'

  const userRequirementsBlock = body.userRequirements
    ? `\n=== ユーザーからの要求 ===\n${body.userRequirements}\n=== 要求ここまで ===\n\n上記の要求を踏まえて記事を作成してください。`
    : ''

  const systemInstruction = `あなたはSNSマーケティング用の記事を書くプロのライターです。
noteプラットフォームに投稿する記事を作成してください。

記事の品質基準：
- SEOを意識したタイトル付け
- 読者を引きつける導入部
- 適切な見出し（##）の使用
- 専門用語には簡単な説明を添える
- 記事末尾にはCTA（次の記事への誘導やフォロー促進）を含める
- noteのマークダウン記法を使用
- 文量は1500-3000文字程度
- AIが書いたとわかりにくい自然な文体
- 実体験や具体例を織り交ぜた書き方
- 複数のソースドキュメントが提供された場合は、それらを横断的に活用する

BAN対策の注意点：
- 明らかにAI生成とわかる定型文を避ける
- 自然な言い回しを使う
- 過度な宣伝やリンク誘導は含めない

回答は必ず以下のJSON形式で返してください（他の文字は含めないでください）：
{
  "title": "記事タイトル",
  "body": "記事本文（マークダウン形式）",
  "summary": "記事の要約（100文字以内、Xのポスト用）",
  "tags": ["タグ1", "タグ2", "タグ3"]
}`

  const prompt = `以下の情報をもとに、noteの記事を作成してください。

トーン: ${tone}
スタイル: ${style}
${userRequirementsBlock}

=== 対象章 ===
タイトル: ${body.chapterTitle}
概要: ${body.chapterSynopsis}

=== 連載全体の構成 ===
${otherChapters.join('\n')}

=== 元ネタとなるコンテンツ ===
${contentText}
=== コンテンツここまで ===

上記の「対象章」の内容に焦点を当てて記事を執筆してください。`

  const response = await generateContent(prompt, systemInstruction)

  let parsed
  try {
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
    title: parsed.title,
    body: parsed.body,
    summary: parsed.summary,
    tags: parsed.tags || [],
  }
})
