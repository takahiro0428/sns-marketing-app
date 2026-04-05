export default defineNuxtRouteMiddleware(async (to) => {
  const { currentUser, authLoading, waitForAuth } = useAuth()

  // Wait for Firebase Auth to initialize (first onAuthStateChanged callback)
  if (authLoading.value) {
    await waitForAuth()
  }

  const publicPages = ['/login', '/signup']
  const isPublicPage = publicPages.includes(to.path)

  if (!currentUser.value && !isPublicPage) {
    return navigateTo('/login')
  }

  if (currentUser.value && isPublicPage) {
    return navigateTo('/projects')
  }
})
