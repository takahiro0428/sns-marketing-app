import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import type { Article, ArticleStatus, ArticleGenerationRequest, PlanChapter } from '~/types'

export function useArticles() {
  const { $firestore } = useNuxtApp()
  const { currentUser } = useAuth()

  const articles = ref<Article[]>([])
  const currentArticle = ref<Article | null>(null)
  const articlesLoading = ref(false)
  const generatingArticle = ref(false)

  const { apiFetch } = useApiFetch()
  const articlesCol = () => collection($firestore, 'articles')

  const mapDoc = (data: DocumentData, id: string): Article => ({
    id,
    projectId: data.projectId,
    userId: data.userId,
    planId: data.planId,
    chapterId: data.chapterId,
    contentSourceId: data.contentSourceId,
    title: data.title,
    body: data.body,
    summary: data.summary || '',
    tags: data.tags || [],
    notePostId: data.notePostId,
    notePostUrl: data.notePostUrl,
    xPostId: data.xPostId,
    xPostUrl: data.xPostUrl,
    status: data.status,
    notePostedAt: data.notePostedAt,
    xPostedAt: data.xPostedAt,
    generationPrompt: data.generationPrompt,
    userRequirements: data.userRequirements,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  })

  const fetchArticles = async (projectId: string) => {
    if (!currentUser.value) return
    articlesLoading.value = true
    try {
      const q = query(
        articlesCol(),
        where('projectId', '==', projectId),
        where('userId', '==', currentUser.value.uid),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      articles.value = snap.docs.map((d) => mapDoc(d.data(), d.id))
    } finally {
      articlesLoading.value = false
    }
  }

  const fetchArticle = async (id: string) => {
    const docRef = doc($firestore, 'articles', id)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      currentArticle.value = mapDoc(snap.data(), snap.id)
      return currentArticle.value
    }
    return null
  }

  const generateArticle = async (request: ArticleGenerationRequest): Promise<Article> => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    generatingArticle.value = true
    try {
      const result = await apiFetch<{
        title: string
        body: string
        summary: string
        tags: string[]
      }>('/api/articles/generate', {
        method: 'POST',
        body: request,
      })

      const articleData: Record<string, unknown> = {
        projectId: request.projectId,
        userId: currentUser.value.uid,
        planId: request.planId,
        chapterId: request.chapterId,
        title: result.title,
        body: result.body,
        summary: result.summary,
        tags: result.tags,
        status: 'draft' as ArticleStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      if (request.userRequirements) {
        articleData.userRequirements = request.userRequirements
      }
      const docRef = await addDoc(articlesCol(), articleData)

      const article = await fetchArticle(docRef.id)
      if (!article) throw new Error('ARTICLE_CREATE_FAILED')
      await fetchArticles(request.projectId)
      return article
    } finally {
      generatingArticle.value = false
    }
  }

  const updateArticle = async (id: string, data: Partial<Pick<Article, 'title' | 'body' | 'summary' | 'tags' | 'status'>>) => {
    const docRef = doc($firestore, 'articles', id)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
    if (currentArticle.value?.id === id) {
      await fetchArticle(id)
    }
  }

  const updateArticlePostStatus = async (
    id: string,
    platform: 'note' | 'x',
    postId: string,
    postUrl: string,
  ) => {
    const docRef = doc($firestore, 'articles', id)
    const article = await fetchArticle(id)
    if (!article) return

    const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() }

    if (platform === 'note') {
      updateData.notePostId = postId
      updateData.notePostUrl = postUrl
      updateData.notePostedAt = serverTimestamp()
      updateData.status = article.xPostId ? 'posted_all' : 'posted_note'
    } else {
      updateData.xPostId = postId
      updateData.xPostUrl = postUrl
      updateData.xPostedAt = serverTimestamp()
      updateData.status = article.notePostId ? 'posted_all' : 'posted_x'
    }

    await updateDoc(docRef, updateData)
    await fetchArticle(id)
  }

  // Batch generation state
  const batchGenerating = ref(false)
  const batchProgress = ref({ total: 0, completed: 0, failed: 0 })

  const generateArticlesBatch = async (
    projectId: string,
    planId: string,
    chapters: PlanChapter[],
    userRequirements?: string,
  ): Promise<string[]> => {
    batchGenerating.value = true
    batchProgress.value = { total: chapters.length, completed: 0, failed: 0 }
    const errors: string[] = []

    for (const chapter of chapters) {
      try {
        await generateArticle({
          projectId,
          planId,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterSynopsis: chapter.synopsis,
          userRequirements,
        })
        batchProgress.value.completed++
      } catch (e) {
        batchProgress.value.failed++
        errors.push(`${chapter.title}: ${e instanceof Error ? e.message : 'エラー'}`)
      }
    }
    batchGenerating.value = false
    return errors
  }

  const deleteArticle = async (id: string, projectId: string) => {
    const docRef = doc($firestore, 'articles', id)
    await deleteDoc(docRef)
    if (currentArticle.value?.id === id) {
      currentArticle.value = null
    }
    await fetchArticles(projectId)
  }

  return {
    articles: readonly(articles),
    currentArticle: readonly(currentArticle),
    articlesLoading: readonly(articlesLoading),
    generatingArticle: readonly(generatingArticle),
    batchGenerating: readonly(batchGenerating),
    batchProgress: readonly(batchProgress),
    fetchArticles,
    fetchArticle,
    generateArticle,
    generateArticlesBatch,
    updateArticle,
    updateArticlePostStatus,
    deleteArticle,
  }
}
