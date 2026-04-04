/**
 * Composable that wraps $fetch to automatically attach Firebase Auth ID token.
 * Use this for all authenticated API calls.
 * Handles token refresh failures by redirecting to login.
 */
export function useApiFetch() {
  const { $auth } = useNuxtApp()
  const router = useRouter()

  const apiFetch = async <T>(url: string, options: Record<string, unknown> = {}): Promise<T> => {
    const user = $auth.currentUser
    if (!user) {
      await navigateTo('/login')
      throw new Error('AUTH_REQUIRED')
    }

    let idToken: string
    try {
      idToken = await user.getIdToken()
    } catch {
      // Token refresh failed - session expired or account disabled
      const { signOut } = useAuth()
      await signOut()
      await navigateTo('/login')
      throw new Error('SESSION_EXPIRED')
    }

    const headers = (options.headers as Record<string, string>) || {}
    headers['Authorization'] = `Bearer ${idToken}`

    try {
      return await $fetch<T>(url, {
        ...options,
        headers,
      })
    } catch (error: unknown) {
      // Handle 401 responses (token invalid on server side)
      const fetchError = error as { statusCode?: number }
      if (fetchError.statusCode === 401) {
        const { signOut } = useAuth()
        await signOut()
        await navigateTo('/login')
        throw new Error('SESSION_EXPIRED')
      }
      throw error
    }
  }

  return { apiFetch }
}
