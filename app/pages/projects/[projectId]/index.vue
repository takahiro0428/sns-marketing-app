<template>
  <div>
    <CommonLoadingSpinner v-if="!currentProject" full-page text="読み込み中..." />

    <div v-else class="space-y-6">
      <!-- Project header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{{ currentProject.name }}</h2>
          <p class="mt-1 text-sm text-gray-600">{{ currentProject.description }}</p>
        </div>
        <CommonStatusBadge :status="currentProject.status" type="project" />
      </div>

      <!-- Workflow progress stepper -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">ワークフロー</h3>

        <!-- Desktop: horizontal stepper -->
        <div class="hidden sm:flex items-start">
          <template v-for="(step, i) in workflowSteps" :key="i">
            <NuxtLink
              :to="step.path"
              class="flex flex-col items-center flex-1 group"
            >
              <!-- Step circle -->
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all"
                :class="[
                  step.done ? 'bg-green-500 text-white shadow-sm' : '',
                  step.current ? 'bg-indigo-500 text-white ring-4 ring-indigo-100 shadow-md' : '',
                  !step.done && !step.current ? 'bg-gray-200 text-gray-500' : '',
                ]"
              >
                <svg v-if="step.done" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <!-- Step label -->
              <p
                class="mt-2 text-sm font-medium text-center group-hover:text-indigo-600 transition-colors"
                :class="step.done ? 'text-green-700' : (step.current ? 'text-indigo-700' : 'text-gray-500')"
              >
                {{ step.label }}
              </p>
              <p class="text-xs text-gray-400 text-center mt-0.5 max-w-[120px]">{{ step.description }}</p>
            </NuxtLink>
            <!-- Connector line between steps -->
            <div
              v-if="i < workflowSteps.length - 1"
              class="flex-1 flex items-center pt-5 px-1"
            >
              <div
                class="h-0.5 w-full rounded"
                :class="step.done ? 'bg-green-400' : 'bg-gray-200'"
              />
            </div>
          </template>
        </div>

        <!-- Mobile: vertical stepper -->
        <div class="sm:hidden space-y-0">
          <template v-for="(step, i) in workflowSteps" :key="`m-${i}`">
            <NuxtLink :to="step.path" class="flex items-center gap-3 py-3 group">
              <!-- Step circle -->
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                :class="[
                  step.done ? 'bg-green-500 text-white' : '',
                  step.current ? 'bg-indigo-500 text-white ring-4 ring-indigo-100' : '',
                  !step.done && !step.current ? 'bg-gray-200 text-gray-500' : '',
                ]"
              >
                <svg v-if="step.done" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <!-- Step info -->
              <div class="flex-1 min-w-0">
                <p
                  class="text-sm font-medium group-hover:text-indigo-600 transition-colors"
                  :class="step.done ? 'text-green-700' : (step.current ? 'text-indigo-700' : 'text-gray-500')"
                >
                  {{ step.label }}
                </p>
                <p class="text-xs text-gray-400 truncate">{{ step.description }}</p>
              </div>
              <!-- Arrow -->
              <svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
            <!-- Vertical connector -->
            <div v-if="i < workflowSteps.length - 1" class="ml-[17px] h-3">
              <div
                class="w-0.5 h-full rounded"
                :class="step.done ? 'bg-green-400' : 'bg-gray-200'"
              />
            </div>
          </template>
        </div>
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card">
          <p class="text-sm text-gray-500">コンテンツ</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ contents.length }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">配信計画</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ plans.length }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">記事</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ articles.length }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">投稿済み</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ postedCount }}</p>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            :to="`/projects/${currentProject.id}/contents`"
            class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">コンテンツ</p>
              <p class="text-xs text-gray-500">元ネタとなるファイルを追加</p>
            </div>
          </NuxtLink>

          <NuxtLink
            :to="`/projects/${currentProject.id}/plans`"
            class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">配信計画を作成</p>
              <p class="text-xs text-gray-500">AIが最適な配信計画を提案</p>
            </div>
          </NuxtLink>

          <NuxtLink
            :to="`/projects/${currentProject.id}/articles`"
            class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">記事を管理</p>
              <p class="text-xs text-gray-500">AIが生成した記事を編集・投稿</p>
            </div>
          </NuxtLink>

          <NuxtLink
            :to="`/projects/${currentProject.id}/schedule`"
            class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">スケジュール</p>
              <p class="text-xs text-gray-500">投稿スケジュールを管理</p>
            </div>
          </NuxtLink>

          <NuxtLink
            :to="`/projects/${currentProject.id}/logs`"
            class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">投稿ログ</p>
              <p class="text-xs text-gray-500">投稿履歴とステータスを確認</p>
            </div>
          </NuxtLink>

          <NuxtLink
            :to="`/projects/${currentProject.id}/settings`"
            class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">設定</p>
              <p class="text-xs text-gray-500">プラットフォーム認証情報を設定</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Recent activity -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">最近の投稿ログ</h3>
        <div v-if="postLogs.length === 0" class="text-sm text-gray-500 text-center py-8">
          まだ投稿ログがありません
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="log in postLogs.slice(0, 5)"
            :key="log.id"
            class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                :class="log.platform === 'note' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ log.platform === 'note' ? 'N' : 'X' }}
              </div>
              <div>
                <p class="text-sm text-gray-900">{{ log.platform === 'note' ? 'Note' : 'X' }}に投稿</p>
                <p class="text-xs text-gray-500">{{ formatTimestamp(log.createdAt) }}</p>
              </div>
            </div>
            <CommonStatusBadge :status="log.status" type="post" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Timestamp } from 'firebase/firestore'

const route = useRoute()
const projectId = computed(() => route.params.projectId as string)

const { currentProject } = useProjects()
const { contents, fetchContents } = useContents()
const { plans, fetchPlans } = usePlans()
const { articles, fetchArticles } = useArticles()
const { postLogs, fetchPostLogs } = usePostLogs()

const postedCount = computed(() =>
  articles.value.filter((a) => ['posted_note', 'posted_x', 'posted_all'].includes(a.status)).length,
)

const platformLabel = computed(() => {
  if (!currentProject.value) return 'SNSに配信'
  const note = currentProject.value.noteEnabled
  const x = currentProject.value.xEnabled
  if (note && x) return 'NoteとXに配信'
  if (note) return 'Noteに配信'
  if (x) return 'Xに配信'
  return 'SNSに配信'
})

const workflowSteps = computed(() => {
  const pid = projectId.value
  const hasContent = contents.value.length > 0
  const hasPlan = plans.value.length > 0
  const hasArticle = articles.value.length > 0
  const hasPosted = postedCount.value > 0

  const firstIncomplete = !hasContent ? 0 : !hasPlan ? 1 : !hasArticle ? 2 : !hasPosted ? 3 : -1

  return [
    {
      label: 'コンテンツ登録',
      description: hasContent ? `${contents.value.length}件登録済み` : '元ネタをアップロード',
      path: `/projects/${pid}/contents`,
      done: hasContent,
      current: firstIncomplete === 0,
    },
    {
      label: '配信計画',
      description: hasPlan ? `${plans.value.length}件作成済み` : 'AIが計画を提案',
      path: `/projects/${pid}/plans`,
      done: hasPlan,
      current: firstIncomplete === 1,
    },
    {
      label: '記事生成',
      description: hasArticle ? `${articles.value.length}件生成済み` : 'AIが記事を作成',
      path: `/projects/${pid}/articles`,
      done: hasArticle,
      current: firstIncomplete === 2,
    },
    {
      label: '投稿',
      description: hasPosted ? `${postedCount.value}件投稿済み` : platformLabel.value,
      path: `/projects/${pid}/schedule`,
      done: hasPosted,
      current: firstIncomplete === 3,
    },
  ]
})

onMounted(async () => {
  const pid = projectId.value
  await Promise.all([
    fetchContents(pid),
    fetchPlans(pid),
    fetchArticles(pid),
    fetchPostLogs(pid),
  ])
})

const formatTimestamp = (timestamp: Timestamp) => {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleString('ja-JP')
}
</script>
