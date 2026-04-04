import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import type { Project, ProjectFormData, ProjectStatus } from '~/types'

const projects = ref<Project[]>([])
const currentProject = ref<Project | null>(null)
const projectsLoading = ref(false)

export function useProjects() {
  const { $firestore } = useNuxtApp()
  const { currentUser } = useAuth()

  const projectsCol = () => collection($firestore, 'projects')

  const mapDocToProject = (docData: DocumentData, id: string): Project => ({
    id,
    userId: docData.userId,
    name: docData.name,
    description: docData.description,
    status: docData.status,
    noteEnabled: docData.noteEnabled ?? false,
    xEnabled: docData.xEnabled ?? false,
    postingIntervalMinMinutes: docData.postingIntervalMinMinutes ?? 60,
    postingIntervalMaxMinutes: docData.postingIntervalMaxMinutes ?? 180,
    timezone: docData.timezone ?? 'Asia/Tokyo',
    activeHoursStart: docData.activeHoursStart ?? 8,
    activeHoursEnd: docData.activeHoursEnd ?? 22,
    createdAt: docData.createdAt,
    updatedAt: docData.updatedAt,
  })

  const fetchProjects = async () => {
    if (!currentUser.value) return
    projectsLoading.value = true
    try {
      const q = query(
        projectsCol(),
        where('userId', '==', currentUser.value.uid),
        orderBy('updatedAt', 'desc'),
      )
      const snap = await getDocs(q)
      projects.value = snap.docs.map((d) => mapDocToProject(d.data(), d.id))
    } finally {
      projectsLoading.value = false
    }
  }

  const fetchProject = async (id: string) => {
    const docRef = doc($firestore, 'projects', id)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      currentProject.value = mapDocToProject(snap.data(), snap.id)
      return currentProject.value
    }
    return null
  }

  const createProject = async (data: ProjectFormData): Promise<Project> => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    const docRef = await addDoc(projectsCol(), {
      ...data,
      userId: currentUser.value.uid,
      status: 'active' as ProjectStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const created = await fetchProject(docRef.id)
    if (!created) throw new Error('PROJECT_CREATE_FAILED')
    await fetchProjects()
    return created
  }

  const updateProject = async (id: string, data: Partial<ProjectFormData>) => {
    const docRef = doc($firestore, 'projects', id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
    await fetchProjects()
    if (currentProject.value?.id === id) {
      await fetchProject(id)
    }
  }

  const updateProjectStatus = async (id: string, status: ProjectStatus) => {
    const docRef = doc($firestore, 'projects', id)
    await updateDoc(docRef, { status, updatedAt: serverTimestamp() })
    await fetchProjects()
    if (currentProject.value?.id === id) {
      await fetchProject(id)
    }
  }

  const deleteProject = async (id: string) => {
    const { apiFetch } = useApiFetch()
    // Server-side cascading delete (removes all child collections)
    await apiFetch('/api/projects/delete', {
      method: 'POST',
      body: { projectId: id },
    })
    if (currentProject.value?.id === id) {
      currentProject.value = null
    }
    await fetchProjects()
  }

  const selectProject = async (id: string) => {
    await fetchProject(id)
  }

  return {
    projects: readonly(projects),
    currentProject: readonly(currentProject),
    projectsLoading: readonly(projectsLoading),
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    updateProjectStatus,
    deleteProject,
    selectProject,
  }
}
