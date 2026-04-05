/**
 * Auth initialization plugin - runs after firebase plugin.
 * Sets up onAuthStateChanged listener early so auth state
 * is available before route middleware runs.
 */
export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['firebase'],
  setup() {
    const { initAuth } = useAuth()
    initAuth()
  },
})
