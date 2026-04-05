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
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import type { DistributionPlan, PlanChapter, PlanStatus, ChapterStatus } from '~/types'

export function usePlans() {
  const { $firestore } = useNuxtApp()
  const { currentUser } = useAuth()

  const plans = ref<DistributionPlan[]>([])
  const currentPlan = ref<DistributionPlan | null>(null)
  const chapters = ref<PlanChapter[]>([])
  const plansLoading = ref(false)
  const generating = ref(false)

  const { apiFetch } = useApiFetch()
  const plansCol = () => collection($firestore, 'distributionPlans')
  const chaptersCol = () => collection($firestore, 'planChapters')

  const mapPlan = (data: DocumentData, id: string): DistributionPlan => ({
    id,
    projectId: data.projectId,
    userId: data.userId,
    contentSourceId: data.contentSourceId,
    title: data.title,
    totalChapters: data.totalChapters,
    status: data.status,
    aiRationale: data.aiRationale || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  })

  const mapChapter = (data: DocumentData, id: string): PlanChapter => ({
    id,
    planId: data.planId,
    projectId: data.projectId,
    userId: data.userId,
    chapterNumber: data.chapterNumber,
    title: data.title,
    synopsis: data.synopsis,
    status: data.status,
    articleId: data.articleId,
    scheduledAt: data.scheduledAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  })

  const fetchPlans = async (projectId: string) => {
    if (!currentUser.value) return
    plansLoading.value = true
    try {
      const q = query(
        plansCol(),
        where('projectId', '==', projectId),
        where('userId', '==', currentUser.value.uid),
        orderBy('createdAt', 'desc'),
      )
      const snap = await getDocs(q)
      plans.value = snap.docs.map((d) => mapPlan(d.data(), d.id))
    } finally {
      plansLoading.value = false
    }
  }

  const fetchPlan = async (id: string) => {
    const docRef = doc($firestore, 'distributionPlans', id)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      currentPlan.value = mapPlan(snap.data(), snap.id)
      return currentPlan.value
    }
    return null
  }

  const fetchChapters = async (planId: string) => {
    if (!currentUser.value) return []
    const q = query(
      chaptersCol(),
      where('planId', '==', planId),
      where('userId', '==', currentUser.value.uid),
      orderBy('chapterNumber', 'asc'),
    )
    const snap = await getDocs(q)
    chapters.value = snap.docs.map((d) => mapChapter(d.data(), d.id))
    return chapters.value
  }

  const generatePlan = async (
    projectId: string,
    contentSourceId: string,
    suggestedChapters?: number,
  ): Promise<{ plan: DistributionPlan; chapters: PlanChapter[] }> => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    generating.value = true
    try {
      const result = await apiFetch<{
        plan: { title: string; totalChapters: number; aiRationale: string }
        chapters: Array<{ title: string; synopsis: string }>
      }>('/api/plans/generate', {
        method: 'POST',
        body: { projectId, contentSourceId, suggestedChapters },
      })

      // Save plan
      const planRef = await addDoc(plansCol(), {
        projectId,
        userId: currentUser.value.uid,
        contentSourceId,
        title: result.plan.title,
        totalChapters: result.plan.totalChapters,
        status: 'draft' as PlanStatus,
        aiRationale: result.plan.aiRationale,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Save chapters in batch
      const batch = writeBatch($firestore)
      for (let i = 0; i < result.chapters.length; i++) {
        const chapterRef = doc(chaptersCol())
        batch.set(chapterRef, {
          planId: planRef.id,
          projectId,
          userId: currentUser.value!.uid,
          chapterNumber: i + 1,
          title: result.chapters[i].title,
          synopsis: result.chapters[i].synopsis,
          status: 'pending' as ChapterStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      await batch.commit()

      const plan = await fetchPlan(planRef.id)
      const chaptersList = await fetchChapters(planRef.id)
      await fetchPlans(projectId)

      return { plan: plan!, chapters: chaptersList }
    } finally {
      generating.value = false
    }
  }

  const updatePlanStatus = async (planId: string, status: PlanStatus) => {
    const docRef = doc($firestore, 'distributionPlans', planId)
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() })
    if (currentPlan.value?.id === planId) {
      currentPlan.value = { ...currentPlan.value, status }
    }
  }

  const updateChapter = async (
    chapterId: string,
    data: Partial<Pick<PlanChapter, 'title' | 'synopsis' | 'status' | 'scheduledAt'>>,
  ) => {
    const docRef = doc($firestore, 'planChapters', chapterId)
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
  }

  const reorderChapters = async (planId: string, orderedIds: string[]) => {
    const batch = writeBatch($firestore)
    orderedIds.forEach((id, index) => {
      const docRef = doc($firestore, 'planChapters', id)
      batch.update(docRef, { chapterNumber: index + 1, updatedAt: serverTimestamp() })
    })
    await batch.commit()
    await fetchChapters(planId)
  }

  const deletePlan = async (planId: string, projectId: string) => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    // Delete chapters first
    const chapSnap = await getDocs(query(chaptersCol(), where('planId', '==', planId), where('userId', '==', currentUser.value.uid)))
    const batch = writeBatch($firestore)
    chapSnap.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(doc($firestore, 'distributionPlans', planId))
    await batch.commit()

    if (currentPlan.value?.id === planId) {
      currentPlan.value = null
      chapters.value = []
    }
    await fetchPlans(projectId)
  }

  return {
    plans: readonly(plans),
    currentPlan: readonly(currentPlan),
    chapters: readonly(chapters),
    plansLoading: readonly(plansLoading),
    generating: readonly(generating),
    fetchPlans,
    fetchPlan,
    fetchChapters,
    generatePlan,
    updatePlanStatus,
    updateChapter,
    reorderChapters,
    deletePlan,
  }
}
