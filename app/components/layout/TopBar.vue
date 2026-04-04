<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
    <div class="flex items-center gap-4">
      <!-- Mobile menu button -->
      <button
        class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        @click="$emit('toggleSidebar')"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 class="text-lg font-semibold text-gray-900 truncate">
        {{ pageTitle }}
      </h1>
    </div>

    <div class="flex items-center gap-3">
      <!-- User menu -->
      <div class="relative" ref="menuRef">
        <button
          class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          @click="showMenu = !showMenu"
        >
          <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span class="text-sm font-medium text-indigo-700">
              {{ userInitial }}
            </span>
          </div>
          <span class="hidden sm:block text-sm text-gray-700 max-w-[120px] truncate">
            {{ displayName }}
          </span>
        </button>

        <!-- Dropdown -->
        <div
          v-if="showMenu"
          class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-gray-200 py-1 z-50"
        >
          <div class="px-4 py-2 border-b border-gray-100">
            <p class="text-sm font-medium text-gray-900 truncate">{{ displayName }}</p>
            <p class="text-xs text-gray-500 truncate">{{ userProfile?.email }}</p>
          </div>
          <NuxtLink
            to="/projects"
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            @click="showMenu = false"
          >
            プロジェクト一覧
          </NuxtLink>
          <button
            class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            @click="handleSignOut"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineEmits<{
  toggleSidebar: []
}>()

const { userProfile, signOut } = useAuth()
const router = useRouter()
const route = useRoute()

const showMenu = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const displayName = computed(() => userProfile.value?.displayName || 'User')
const userInitial = computed(() => displayName.value.charAt(0).toUpperCase())

const pageTitle = computed(() => {
  const path = route.path
  if (path.includes('/contents')) return 'コンテンツ管理'
  if (path.includes('/plans')) return '配信計画'
  if (path.includes('/articles')) return '記事管理'
  if (path.includes('/schedule')) return 'スケジュール'
  if (path.includes('/logs')) return '投稿ログ'
  if (path.includes('/settings')) return '設定'
  if (path.includes('/projects') && !route.params.projectId) return 'プロジェクト一覧'
  return 'ダッシュボード'
})

const handleSignOut = async () => {
  showMenu.value = false
  await signOut()
  router.push('/login')
}

// Close menu on outside click
onMounted(() => {
  const handler = (e: MouseEvent) => {
    if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
      showMenu.value = false
    }
  }
  document.addEventListener('click', handler)
  onUnmounted(() => document.removeEventListener('click', handler))
})
</script>
