import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'
import type { ScheduleEntry, PostPlatform, ScheduleStatus } from '~/types'

export function useScheduler() {
  const { $firestore } = useNuxtApp()
  const { currentUser } = useAuth()

  const schedules = ref<ScheduleEntry[]>([])
  const schedulesLoading = ref(false)

  const schedulesCol = () => collection($firestore, 'scheduleEntries')

  const mapDoc = (data: DocumentData, id: string): ScheduleEntry => ({
    id,
    projectId: data.projectId,
    articleId: data.articleId,
    platform: data.platform,
    scheduledAt: data.scheduledAt,
    status: data.status,
    createdAt: data.createdAt,
  })

  const fetchSchedules = async (projectId: string) => {
    if (!currentUser.value) return
    schedulesLoading.value = true
    try {
      const q = query(
        schedulesCol(),
        where('projectId', '==', projectId),
        where('userId', '==', currentUser.value!.uid),
        orderBy('scheduledAt', 'asc'),
      )
      const snap = await getDocs(q)
      schedules.value = snap.docs.map((d) => mapDoc(d.data(), d.id))
    } finally {
      schedulesLoading.value = false
    }
  }

  const addSchedule = async (
    projectId: string,
    articleId: string,
    platform: PostPlatform,
    scheduledAt: Date,
  ): Promise<ScheduleEntry> => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    const docRef = await addDoc(schedulesCol(), {
      projectId,
      userId: currentUser.value.uid,
      articleId,
      platform,
      scheduledAt: Timestamp.fromDate(scheduledAt),
      status: 'active' as ScheduleStatus,
      createdAt: serverTimestamp(),
    })

    await fetchSchedules(projectId)
    return schedules.value.find((s) => s.id === docRef.id)!
  }

  const autoScheduleChapters = async (
    projectId: string,
    chapters: Array<{ articleId: string }>,
    platforms: PostPlatform[],
    startDate: Date,
    intervalMinMinutes: number,
    intervalMaxMinutes: number,
    activeHoursStart: number,
    activeHoursEnd: number,
  ) => {
    let currentTime = new Date(startDate)

    // Validate active hours to prevent infinite loop
    if (activeHoursStart >= activeHoursEnd) {
      throw new Error('INVALID_ACTIVE_HOURS: start must be less than end')
    }

    for (const chapter of chapters) {
      for (const platform of platforms) {
        // Ensure within active hours (with max 48 iteration guard)
        let guard = 0
        while (
          (currentTime.getHours() < activeHoursStart ||
          currentTime.getHours() >= activeHoursEnd) &&
          guard < 48
        ) {
          currentTime.setHours(currentTime.getHours() + 1)
          currentTime.setMinutes(0)
          guard++
        }

        await addSchedule(projectId, chapter.articleId, platform, new Date(currentTime))

        // Add random interval between min and max
        const interval = Math.floor(
          Math.random() * (intervalMaxMinutes - intervalMinMinutes + 1) + intervalMinMinutes,
        )
        currentTime = new Date(currentTime.getTime() + interval * 60 * 1000)
      }
    }
  }

  const updateScheduleStatus = async (id: string, status: ScheduleStatus) => {
    const docRef = doc($firestore, 'scheduleEntries', id)
    await updateDoc(docRef, { status })
  }

  const deleteSchedule = async (id: string, projectId: string) => {
    const docRef = doc($firestore, 'scheduleEntries', id)
    await deleteDoc(docRef)
    await fetchSchedules(projectId)
  }

  const cancelAllSchedules = async (projectId: string) => {
    const activeSchedules = schedules.value.filter((s) => s.status === 'active')
    for (const schedule of activeSchedules) {
      await updateScheduleStatus(schedule.id, 'paused')
    }
    await fetchSchedules(projectId)
  }

  return {
    schedules: readonly(schedules),
    schedulesLoading: readonly(schedulesLoading),
    fetchSchedules,
    addSchedule,
    autoScheduleChapters,
    updateScheduleStatus,
    deleteSchedule,
    cancelAllSchedules,
  }
}
