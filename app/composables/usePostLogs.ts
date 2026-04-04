import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import type { PostLog, PostPlatform, PostStatus } from '~/types'

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
  ): Promise<PostLog> => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    posting.value = true

    // Create pending log entry
    const logRef = await addDoc(logsCol(), {
      projectId,
      userId: currentUser.value.uid,
      articleId,
      platform,
      status: 'posting' as PostStatus,
      retryCount: 0,
      createdAt: serverTimestamp(),
    })

    try {
      const result = await apiFetch<{
        postId: string
        postUrl: string
      }>('/api/posts/publish', {
        method: 'POST',
        body: { articleId, projectId, platform },
      })

      await updateDoc(doc($firestore, 'postLogs', logRef.id), {
        status: 'success' as PostStatus,
        externalPostId: result.postId,
        externalPostUrl: result.postUrl,
        postedAt: serverTimestamp(),
      })

      await fetchPostLogs(projectId)
      const updatedLogs = postLogs.value
      return updatedLogs.find((l) => l.id === logRef.id) || mapDoc({
        projectId,
        userId: currentUser.value!.uid,
        articleId,
        platform,
        status: 'success',
        externalPostId: result.postId,
        externalPostUrl: result.postUrl,
        retryCount: 0,
      }, logRef.id)
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      await updateDoc(doc($firestore, 'postLogs', logRef.id), {
        status: 'failed' as PostStatus,
        errorMessage: errMsg,
      })
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
