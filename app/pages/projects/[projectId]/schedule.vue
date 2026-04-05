<template>
  <div class="space-y-6">
    <ProjectWorkflowNav :current-step="4" />

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-gray-900">スケジュール管理</h2>
        <p class="text-sm text-gray-600">記事の投稿スケジュールを管理</p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="activeScheduleCount > 0"
          class="btn-secondary btn-sm"
          :disabled="processing"
          @click="handleProcessNow"
        >
          <CommonLoadingSpinner v-if="processing" size="sm" />
          <span v-else>今すぐ処理</span>
        </button>
        <button class="btn-secondary btn-sm" @click="showAutoSchedule = true">
          自動スケジュール
        </button>
        <button class="btn-primary btn-sm" @click="showAddSchedule = true">
          スケジュール追加
        </button>
      </div>
    </div>

    <!-- Throttle status (only enabled platforms) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div v-if="currentProject?.noteEnabled" class="card">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="text-sm font-bold text-green-700">N</span>
          </div>
          <h3 class="font-semibold text-gray-900">Note</h3>
        </div>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">本日の残り</span>
            <span class="font-medium">{{ noteThrottle?.remainingToday ?? '-' }} / {{ noteThrottle?.limits?.dailyLimit ?? '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">今週の残り</span>
            <span class="font-medium">{{ noteThrottle?.remainingThisWeek ?? '-' }} / {{ noteThrottle?.limits?.weeklyLimit ?? '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">ステータス</span>
            <span :class="noteThrottle?.allowed ? 'text-green-600' : 'text-red-600'" class="font-medium">
              {{ noteThrottle?.allowed ? '投稿可能' : noteThrottle?.reason || '確認中...' }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="currentProject?.xEnabled" class="card">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-sm font-bold text-blue-700">X</span>
          </div>
          <h3 class="font-semibold text-gray-900">X (Twitter)</h3>
        </div>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">本日の残り</span>
            <span class="font-medium">{{ xThrottle?.remainingToday ?? '-' }} / {{ xThrottle?.limits?.dailyLimit ?? '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">今週の残り</span>
            <span class="font-medium">{{ xThrottle?.remainingThisWeek ?? '-' }} / {{ xThrottle?.limits?.weeklyLimit ?? '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">ステータス</span>
            <span :class="xThrottle?.allowed ? 'text-green-600' : 'text-red-600'" class="font-medium">
              {{ xThrottle?.allowed ? '投稿可能' : xThrottle?.reason || '確認中...' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Schedule list -->
    <div class="card">
      <h3 class="font-semibold text-gray-900 mb-4">予定一覧</h3>

      <CommonLoadingSpinner v-if="schedulesLoading" text="読み込み中..." />

      <CommonEmptyState
        v-else-if="schedules.length === 0"
        title="スケジュールがありません"
        description="記事の投稿スケジュールを追加してください"
        icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-3 px-2 font-medium text-gray-500">記事</th>
              <th class="text-left py-3 px-2 font-medium text-gray-500">プラットフォーム</th>
              <th class="text-left py-3 px-2 font-medium text-gray-500">予定日時</th>
              <th class="text-left py-3 px-2 font-medium text-gray-500">ステータス</th>
              <th class="text-right py-3 px-2 font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="schedule in schedules"
              :key="schedule.id"
              class="border-b border-gray-100 last:border-0"
            >
              <td class="py-3 px-2">
                <span class="text-gray-900">{{ getArticleTitle(schedule.articleId) }}</span>
              </td>
              <td class="py-3 px-2">
                <span
                  class="badge"
                  :class="schedule.platform === 'note' ? 'badge-success' : 'badge-info'"
                >
                  {{ schedule.platform === 'note' ? 'Note' : 'X' }}
                </span>
              </td>
              <td class="py-3 px-2 text-gray-600">
                {{ formatTimestamp(schedule.scheduledAt) }}
              </td>
              <td class="py-3 px-2">
                <CommonStatusBadge :status="schedule.status" />
              </td>
              <td class="py-3 px-2 text-right">
                <button
                  v-if="schedule.status === 'active'"
                  class="text-red-600 hover:text-red-800 text-xs"
                  @click="handleDeleteSchedule(schedule.id)"
                >
                  削除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add schedule modal -->
    <Teleport to="body">
      <div v-if="showAddSchedule" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" @click="showAddSchedule = false" />
        <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-4">スケジュール追加</h3>
          <form @submit.prevent="handleAddSchedule" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">記事</label>
              <select v-model="newSchedule.articleId" required class="input-field">
                <option value="">選択してください</option>
                <option v-for="a in availableArticles" :key="a.id" :value="a.id">
                  {{ a.title }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">プラットフォーム</label>
              <select v-model="newSchedule.platform" required class="input-field">
                <option v-if="currentProject?.noteEnabled" value="note">Note</option>
                <option v-if="currentProject?.xEnabled" value="x">X (Twitter)</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">投稿日時</label>
              <input v-model="newSchedule.scheduledAt" type="datetime-local" required class="input-field" />
            </div>
            <div class="flex justify-end gap-3">
              <button type="button" class="btn-secondary" @click="showAddSchedule = false">キャンセル</button>
              <button type="submit" class="btn-primary" :disabled="addingSchedule">追加</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Auto schedule modal -->
    <Teleport to="body">
      <div v-if="showAutoSchedule" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" @click="showAutoSchedule = false" />
        <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-4">自動スケジュール生成</h3>
          <p class="text-sm text-gray-600 mb-4">
            承認済み記事に対して、BAN対策を考慮した投稿間隔で自動的にスケジュールを生成します。
          </p>
          <form @submit.prevent="handleAutoSchedule" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">開始日時</label>
              <input v-model="autoScheduleStart" type="datetime-local" required class="input-field" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label v-if="currentProject?.noteEnabled" class="flex items-center gap-2">
                <input v-model="autoSchedulePlatforms" value="note" type="checkbox" class="w-4 h-4 text-indigo-600 rounded" />
                <span class="text-sm">Note</span>
              </label>
              <label v-if="currentProject?.xEnabled" class="flex items-center gap-2">
                <input v-model="autoSchedulePlatforms" value="x" type="checkbox" class="w-4 h-4 text-indigo-600 rounded" />
                <span class="text-sm">X</span>
              </label>
            </div>
            <div class="flex justify-end gap-3">
              <button type="button" class="btn-secondary" @click="showAutoSchedule = false">キャンセル</button>
              <button type="submit" class="btn-primary" :disabled="autoScheduling">
                <CommonLoadingSpinner v-if="autoScheduling" size="sm" />
                <span v-else>生成</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirmation -->
    <CommonConfirmDialog
      v-model="showDeleteConfirm"
      title="スケジュールを削除しますか？"
      message="このスケジュールを削除します。この操作は取り消せません。"
      confirm-text="削除する"
      :danger="true"
      @confirm="confirmDeleteSchedule"
    />

    <!-- Notification banners -->
    <Teleport to="body">
      <div
        v-if="errorMessage"
        class="fixed top-4 right-4 z-50 max-w-sm bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg"
      >
        <div class="flex items-start gap-3">
          <p class="text-sm text-red-700 flex-1">{{ errorMessage }}</p>
          <button class="text-red-400 hover:text-red-600" @click="errorMessage = ''">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div
        v-if="successMessage"
        class="fixed top-4 right-4 z-50 max-w-sm bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg"
      >
        <div class="flex items-start gap-3">
          <p class="text-sm text-green-700 flex-1">{{ successMessage }}</p>
          <button class="text-green-400 hover:text-green-600" @click="successMessage = ''">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Timestamp } from 'firebase/firestore'
import type { PostPlatform } from '~/types'

const route = useRoute()
const projectId = computed(() => route.params.projectId as string)

const { schedules, schedulesLoading, fetchSchedules, addSchedule, autoScheduleChapters, deleteSchedule, processSchedules } = useScheduler()
const { articles, fetchArticles } = useArticles()
const { currentProject } = useProjects()
const { apiFetch } = useApiFetch()

const showAddSchedule = ref(false)
const showAutoSchedule = ref(false)
const showDeleteConfirm = ref(false)
const addingSchedule = ref(false)
const autoScheduling = ref(false)
const processing = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const deleteTargetId = ref('')

const activeScheduleCount = computed(() =>
  schedules.value.filter((s) => s.status === 'active').length,
)

const noteThrottle = ref<Record<string, unknown> | null>(null)
const xThrottle = ref<Record<string, unknown> | null>(null)

const defaultPlatform = computed<PostPlatform>(() => {
  if (currentProject.value?.noteEnabled) return 'note'
  if (currentProject.value?.xEnabled) return 'x'
  return 'note'
})

const newSchedule = ref({
  articleId: '',
  platform: 'note' as PostPlatform,
  scheduledAt: '',
})

// Update default platform when project loads
watch(defaultPlatform, (val) => {
  if (!newSchedule.value.platform || newSchedule.value.platform !== val) {
    newSchedule.value.platform = val
  }
}, { immediate: true })

const autoScheduleStart = ref('')
const autoSchedulePlatforms = ref<PostPlatform[]>([])

// Initialize default platforms based on project settings
watch(() => currentProject.value, (project) => {
  if (project && autoSchedulePlatforms.value.length === 0) {
    const defaults: PostPlatform[] = []
    if (project.noteEnabled) defaults.push('note')
    if (project.xEnabled) defaults.push('x')
    autoSchedulePlatforms.value = defaults
  }
}, { immediate: true })

const availableArticles = computed(() =>
  articles.value.filter((a) => ['draft', 'review', 'approved'].includes(a.status)),
)

const getArticleTitle = (articleId: string) => {
  const article = articles.value.find((a) => a.id === articleId)
  return article?.title || '不明な記事'
}

const formatTimestamp = (timestamp: Timestamp) => {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleString('ja-JP')
}

const loadThrottleStatus = async () => {
  try {
    const promises: Promise<void>[] = []
    if (currentProject.value?.noteEnabled) {
      promises.push(
        apiFetch('/api/posts/check-throttle', { method: 'POST', body: { projectId: projectId.value, platform: 'note' } })
          .then((r) => { noteThrottle.value = r as Record<string, unknown> }),
      )
    }
    if (currentProject.value?.xEnabled) {
      promises.push(
        apiFetch('/api/posts/check-throttle', { method: 'POST', body: { projectId: projectId.value, platform: 'x' } })
          .then((r) => { xThrottle.value = r as Record<string, unknown> }),
      )
    }
    await Promise.all(promises)
  } catch {
    // Non-blocking
  }
}

const handleAddSchedule = async () => {
  errorMessage.value = ''
  addingSchedule.value = true
  try {
    await addSchedule(
      projectId.value,
      newSchedule.value.articleId,
      newSchedule.value.platform,
      new Date(newSchedule.value.scheduledAt),
    )
    showAddSchedule.value = false
    newSchedule.value = { articleId: '', platform: 'note', scheduledAt: '' }
  } catch {
    errorMessage.value = 'スケジュールの追加に失敗しました'
  } finally {
    addingSchedule.value = false
  }
}

const handleAutoSchedule = async () => {
  if (!currentProject.value || autoSchedulePlatforms.value.length === 0) return
  errorMessage.value = ''
  autoScheduling.value = true
  try {
    const approvedArticles = articles.value
      .filter((a) => ['approved', 'draft'].includes(a.status))
      .map((a) => ({ articleId: a.id }))

    if (approvedArticles.length === 0) {
      errorMessage.value = '対象となる記事がありません。先に記事を生成してください。'
      return
    }

    await autoScheduleChapters(
      projectId.value,
      approvedArticles,
      autoSchedulePlatforms.value,
      new Date(autoScheduleStart.value),
      currentProject.value.postingIntervalMinMinutes,
      currentProject.value.postingIntervalMaxMinutes,
      currentProject.value.activeHoursStart,
      currentProject.value.activeHoursEnd,
    )
    showAutoSchedule.value = false
  } catch {
    errorMessage.value = '自動スケジュール生成に失敗しました'
  } finally {
    autoScheduling.value = false
  }
}

const handleProcessNow = async () => {
  processing.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await processSchedules(projectId.value)
    if (result.processed === 0) {
      successMessage.value = '処理対象のスケジュールはありません（予定日時がまだ到来していません）'
    } else {
      const succeeded = result.results.filter((r) => r.status === 'success').length
      const failed = result.results.filter((r) => r.status === 'failed').length
      const throttled = result.results.filter((r) => r.status === 'throttled').length
      const parts: string[] = []
      if (succeeded > 0) parts.push(`${succeeded}件成功`)
      if (failed > 0) parts.push(`${failed}件失敗`)
      if (throttled > 0) parts.push(`${throttled}件制限中`)
      successMessage.value = `処理完了: ${parts.join('、')}`
    }
    await loadThrottleStatus()
  } catch {
    errorMessage.value = 'スケジュールの処理に失敗しました'
  } finally {
    processing.value = false
  }
}

const handleDeleteSchedule = (id: string) => {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

const confirmDeleteSchedule = async () => {
  showDeleteConfirm.value = false
  try {
    await deleteSchedule(deleteTargetId.value, projectId.value)
  } catch {
    errorMessage.value = 'スケジュールの削除に失敗しました'
  }
}

onMounted(async () => {
  await Promise.all([
    fetchSchedules(projectId.value),
    fetchArticles(projectId.value),
    loadThrottleStatus(),
  ])
})
</script>
