<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">プロジェクト</h1>
            <p class="mt-1 text-sm text-gray-600">SNSマーケティングプロジェクトを管理</p>
          </div>
          <div class="flex items-center gap-3">
            <button class="btn-primary" @click="showCreateModal = true">
              <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              新規プロジェクト
            </button>
            <button class="btn-secondary btn-sm" @click="handleSignOut">ログアウト</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CommonLoadingSpinner v-if="projectsLoading" full-page text="プロジェクトを読み込み中..." />

      <CommonEmptyState
        v-else-if="projects.length === 0"
        title="プロジェクトがありません"
        description="新しいプロジェクトを作成して、SNSマーケティングを始めましょう"
        icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      >
        <template #action>
          <button class="btn-primary" @click="showCreateModal = true">
            最初のプロジェクトを作成
          </button>
        </template>
      </CommonEmptyState>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="project in projects"
          :key="project.id"
          class="card hover:shadow-md transition-shadow cursor-pointer group"
          @click="openProject(project.id)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {{ project.name }}
              </h3>
              <p class="mt-1 text-sm text-gray-500 line-clamp-2">
                {{ project.description || '説明なし' }}
              </p>
            </div>
            <CommonStatusBadge :status="project.status" type="project" />
          </div>

          <div class="mt-4 flex items-center gap-4 text-xs text-gray-500">
            <div v-if="project.noteEnabled" class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-green-500" />
              Note
            </div>
            <div v-if="project.xEnabled" class="flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-blue-500" />
              X
            </div>
            <div class="ml-auto">
              {{ formatDate(project.createdAt) }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create project modal -->
    <ProjectCreateModal
      v-model="showCreateModal"
      @created="handleProjectCreated"
    />
  </div>
</template>

<script setup lang="ts">
import type { Timestamp } from 'firebase/firestore'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { projects, projectsLoading, fetchProjects, selectProject } = useProjects()
const { signOut } = useAuth()
const router = useRouter()

const showCreateModal = ref(false)

onMounted(() => {
  fetchProjects()
})

const openProject = async (id: string) => {
  await selectProject(id)
  router.push(`/projects/${id}`)
}

const handleProjectCreated = (projectId: string) => {
  showCreateModal.value = false
  router.push(`/projects/${projectId}`)
}

const handleSignOut = async () => {
  await signOut()
  router.push('/login')
}

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleDateString('ja-JP')
}
</script>
