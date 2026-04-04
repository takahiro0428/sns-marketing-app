export default defineNuxtRouteMiddleware((to) => {
  const { currentUser, authLoading } = useAuth()

  if (authLoading.value) return

  const publicPages = ['/login', '/signup']
  const isPublicPage = publicPages.includes(to.path)

  if (!currentUser.value && !isPublicPage) {
    return navigateTo('/login')
  }

  if (currentUser.value && isPublicPage) {
    return navigateTo('/projects')
  }
})
