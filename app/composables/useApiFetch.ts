/**
 * Composable that wraps $fetch to automatically attach Firebase Auth ID token.
 * Use this for all authenticated API calls.
 */
export function useApiFetch() {
  const { $auth } = useNuxtApp()

  const apiFetch = async <T>(url: string, options: Record<string, unknown> = {}): Promise<T> => {
    const user = $auth.currentUser
    if (!user) {
      throw new Error('AUTH_REQUIRED')
    }

    const idToken = await user.getIdToken()

    const headers = (options.headers as Record<string, string>) || {}
    headers['Authorization'] = `Bearer ${idToken}`

    return $fetch<T>(url, {
      ...options,
      headers,
    })
  }

  return { apiFetch }
}
