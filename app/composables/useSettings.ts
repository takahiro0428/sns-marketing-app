import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import type { PlatformSettings } from '~/types'

export function useSettings() {
  const { $firestore } = useNuxtApp()
  const { currentUser } = useAuth()

  const settings = ref<PlatformSettings | null>(null)
  const settingsLoading = ref(false)
  const saving = ref(false)

  const { apiFetch } = useApiFetch()

  const mapDoc = (data: DocumentData, id: string): PlatformSettings => ({
    id,
    projectId: data.projectId,
    userId: data.userId,
    noteCredentials: data.noteCredentials,
    xCredentials: data.xCredentials,
    noteSessionToken: data.noteSessionToken,
    noteSessionExpiresAt: data.noteSessionExpiresAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  })

  const getSettingsId = (projectId: string) => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    return `${currentUser.value.uid}_${projectId}`
  }

  const fetchSettings = async (projectId: string) => {
    if (!currentUser.value) return
    settingsLoading.value = true
    try {
      const docRef = doc($firestore, 'platformSettings', getSettingsId(projectId))
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        settings.value = mapDoc(snap.data(), snap.id)
      } else {
        settings.value = null
      }
    } finally {
      settingsLoading.value = false
    }
  }

  const saveNoteCredentials = async (projectId: string, email: string, password: string) => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    saving.value = true
    try {
      const docId = getSettingsId(projectId)
      const docRef = doc($firestore, 'platformSettings', docId)

      // Encrypt via server
      const encrypted = await apiFetch<{ encryptedPassword: string }>('/api/settings/encrypt', {
        method: 'POST',
        body: { value: password },
      })

      await setDoc(docRef, {
        projectId,
        userId: currentUser.value.uid,
        noteCredentials: {
          email,
          password: encrypted.encryptedPassword,
        },
        updatedAt: serverTimestamp(),
        createdAt: settings.value?.createdAt || serverTimestamp(),
      }, { merge: true })

      await fetchSettings(projectId)
    } finally {
      saving.value = false
    }
  }

  const saveXCredentials = async (
    projectId: string,
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string,
  ) => {
    if (!currentUser.value) throw new Error('AUTH_REQUIRED')
    saving.value = true
    try {
      const docId = getSettingsId(projectId)
      const docRef = doc($firestore, 'platformSettings', docId)

      // Encrypt all X credentials before storage
      const [encApiKey, encApiSecret, encAccessToken, encAccessTokenSecret] = await Promise.all([
        apiFetch<{ encryptedPassword: string }>('/api/settings/encrypt', { method: 'POST', body: { value: apiKey } }),
        apiFetch<{ encryptedPassword: string }>('/api/settings/encrypt', { method: 'POST', body: { value: apiSecret } }),
        apiFetch<{ encryptedPassword: string }>('/api/settings/encrypt', { method: 'POST', body: { value: accessToken } }),
        apiFetch<{ encryptedPassword: string }>('/api/settings/encrypt', { method: 'POST', body: { value: accessTokenSecret } }),
      ])

      await setDoc(docRef, {
        projectId,
        userId: currentUser.value.uid,
        xCredentials: {
          apiKey: encApiKey.encryptedPassword,
          apiSecret: encApiSecret.encryptedPassword,
          accessToken: encAccessToken.encryptedPassword,
          accessTokenSecret: encAccessTokenSecret.encryptedPassword,
        },
        updatedAt: serverTimestamp(),
        createdAt: settings.value?.createdAt || serverTimestamp(),
      }, { merge: true })

      await fetchSettings(projectId)
    } finally {
      saving.value = false
    }
  }

  const testNoteConnection = async (projectId: string): Promise<boolean> => {
    try {
      const result = await apiFetch<{ success: boolean }>('/api/settings/test-note', {
        method: 'POST',
        body: { projectId },
      })
      return result.success
    } catch {
      return false
    }
  }

  const testXConnection = async (projectId: string): Promise<boolean> => {
    try {
      const result = await apiFetch<{ success: boolean }>('/api/settings/test-x', {
        method: 'POST',
        body: { projectId },
      })
      return result.success
    } catch {
      return false
    }
  }

  return {
    settings: readonly(settings),
    settingsLoading: readonly(settingsLoading),
    saving: readonly(saving),
    fetchSettings,
    saveNoteCredentials,
    saveXCredentials,
    testNoteConnection,
    testXConnection,
  }
}
