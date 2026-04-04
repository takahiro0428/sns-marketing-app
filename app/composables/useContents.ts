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
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import type { ContentSource, ContentSourceType } from '~/types'

export function useContents() {
  const { $firestore, $storage } = useNuxtApp()
  const { currentUser } = useAuth()

  const contents = ref<ContentSource[]>([])
  const contentsLoading = ref(false)

  const contentsCol = () => collection($firestore, 'contentSources')

  const mapDoc = (data: DocumentData, id: string): ContentSource => ({
    id,
    projectId: data.projectId,
    userId: data.userId,
    title: data.title,
    sourceType: data.sourceType,
    originalFileName: data.originalFileName,
    storageUrl: data.storageUrl,
    rawText: data.rawText,
    summary: data.summary,
    tags: data.tags || [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  })

  const fetchContents = async (projectId: string) => {
    if (!currentUser.value) return
    contentsLoading.value = true
    try {
      const q = query(
        contentsCol(),
        where('projectId', '==', projectId),
        where('userId', '==', currentUser.value.uid),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      contents.value = snap.docs.map((d) => mapDoc(d.data(), d.id))
    } finally {
      contentsLoading.value = false
    }
  }

  const getContent = async (id: string): Promise<ContentSource | null> => {
    const docRef = doc($firestore, 'contentSources', id)
    const snap = await getDoc(docRef)
    if (snap.exists()) return mapDoc(snap.data(), snap.id)
    return null
  }

  const { apiFetch } = useApiFetch()

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md')) {
      return await file.text()
    }

    if (file.type === 'application/pdf') {
      // PDF text extraction via server API
      const formData = new FormData()
      formData.append('file', file)
      const response = await apiFetch<{ text: string }>('/api/extract-text', {
        method: 'POST',
        body: formData,
      })
      return response.text
    }

    // Fallback: read as text
    return await file.text()
  }

  const detectSourceType = (file: File): ContentSourceType => {
    if (file.type === 'application/pdf') return 'pdf'
    if (file.name.endsWith('.md')) return 'markdown'
    return 'text'
  }

  const uploadContent = async (
    projectId: string,
    file: File,
    title: string,
    tags: string[] = [],
  ): Promise<ContentSource> => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')

    const sourceType = detectSourceType(file)
    const rawText = await extractTextFromFile(file)

    // Upload file to Firebase Storage
    const filePath = `contents/${currentUser.value.uid}/${projectId}/${Date.now()}_${file.name}`
    const fileRef = storageRef($storage, filePath)
    await uploadBytes(fileRef, file)
    const storageUrl = await getDownloadURL(fileRef)

    const docRef = await addDoc(contentsCol(), {
      projectId,
      userId: currentUser.value.uid,
      title,
      sourceType,
      originalFileName: file.name,
      storageUrl,
      rawText,
      tags,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await fetchContents(projectId)
    const created = await getContent(docRef.id)
    if (!created) throw new Error('CONTENT_CREATE_FAILED')
    return created
  }

  const uploadTextContent = async (
    projectId: string,
    title: string,
    text: string,
    tags: string[] = [],
  ): Promise<ContentSource> => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')

    const docRef = await addDoc(contentsCol(), {
      projectId,
      userId: currentUser.value.uid,
      title,
      sourceType: 'text' as ContentSourceType,
      rawText: text,
      tags,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await fetchContents(projectId)
    const created = await getContent(docRef.id)
    if (!created) throw new Error('CONTENT_CREATE_FAILED')
    return created
  }

  const updateContent = async (id: string, data: { title?: string; tags?: string[]; rawText?: string }) => {
    const docRef = doc($firestore, 'contentSources', id)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
  }

  const deleteContent = async (id: string, projectId: string) => {
    const content = await getContent(id)
    if (content?.storageUrl) {
      try {
        const fileRef = storageRef($storage, content.storageUrl)
        await deleteObject(fileRef)
      } catch {
        // Storage deletion failure is non-blocking
        console.warn('Failed to delete storage object, continuing')
      }
    }
    const docRef = doc($firestore, 'contentSources', id)
    await deleteDoc(docRef)
    await fetchContents(projectId)
  }

  return {
    contents: readonly(contents),
    contentsLoading: readonly(contentsLoading),
    fetchContents,
    getContent,
    uploadContent,
    uploadTextContent,
    updateContent,
    deleteContent,
  }
}
