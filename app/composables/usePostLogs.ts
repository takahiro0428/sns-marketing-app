import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  type DocumentData,
} from 'firebase/firestore'
import type { PostLog, PostPlatform } from '~/types'

export function usePostLogs() {
  const { $firestore } = useNuxtApp()
  const { currentUser } = useAuth()

  const postLogs = ref<PostLog[]>([])
  const postLogsLoading = ref(false)
  const posting = ref(false)

  const { apiFetch } = useApiFetch()
  const logsCol = () => collection($firestore, 'postLogs')

  const mapDoc = (data: DocumentData, id: string): PostLog => ({
    id,
    projectId: data.projectId,
    userId: data.userId,
    articleId: data.articleId,
    platform: data.platform,
    status: data.status,
    externalPostId: data.externalPostId,
    externalPostUrl: data.externalPostUrl,
    errorMessage: data.errorMessage,
    errorCode: data.errorCode,
    retryCount: data.retryCount || 0,
    scheduledAt: data.scheduledAt,
    postedAt: data.postedAt,
    createdAt: data.createdAt,
  })

  const fetchPostLogs = async (projectId: string) => {
    if (!currentUser.value) return
    postLogsLoading.value = true
    try {
      const q = query(
        logsCol(),
        where('projectId', '==', projectId),
        where('userId', '==', currentUser.value.uid),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      postLogs.value = snap.docs.map((d) => mapDoc(d.data(), d.id))
    } finally {
      postLogsLoading.value = false
    }
  }

  const postArticle = async (
    articleId: string,
    projectId: string,
    platform: PostPlatform,
  ): Promise<{ postId: string; postUrl: string }> => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    posting.value = true

    try {
      // Server-side publish creates postLog entries automatically
      const result = await apiFetch<{
        postId: string
        postUrl: string
      }>('/api/posts/publish', {
        method: 'POST',
        body: { articleId, projectId, platform },
      })

      // Refresh logs to show the server-created entry
      await fetchPostLogs(projectId)
      return result
    } catch (error: unknown) {
      // Server also creates a failed log entry, refresh to show it
      await fetchPostLogs(projectId)
      throw error
    } finally {
      posting.value = false
    }
  }

  return {
    postLogs: readonly(postLogs),
    postLogsLoading: readonly(postLogsLoading),
    posting: readonly(posting),
    fetchPostLogs,
    postArticle,
  }
}
