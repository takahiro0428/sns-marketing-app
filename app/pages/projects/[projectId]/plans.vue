<template>
  <div class="space-y-6">
    <ProjectWorkflowNav :current-step="2" />

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">配信計画</h2>
        <p class="mt-1 text-sm text-gray-600">AIが元コンテンツを分析し、最適な配信計画を提案します</p>
      </div>
      <button class="btn-primary" @click="showGenerateModal = true">
        <svg class="w-4 h-4 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        計画を生成
      </button>
    </div>

    <!-- Loading -->
    <CommonLoadingSpinner v-if="plansLoading" full-page text="配信計画を読み込み中..." />

    <!-- Empty state -->
    <CommonEmptyState
      v-else-if="plans.length === 0"
      title="配信計画がありません"
      description="コンテンツソースを選択して、AIに配信計画を生成してもらいましょう"
      icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    >
      <template #action>
        <button class="btn-primary" @click="showGenerateModal = true">計画を生成</button>
      </template>
    </CommonEmptyState>

    <!-- Plans list + Detail split view -->
    <div v-else class="flex flex-col lg:flex-row gap-6">
      <!-- Plan list (sidebar on desktop, full-width on mobile when no plan selected) -->
      <div
        class="w-full lg:w-80 lg:shrink-0 space-y-3"
        :class="{ 'hidden lg:block': selectedPlanId }"
      >
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="card cursor-pointer transition-all hover:shadow-md"
          :class="{ 'ring-2 ring-indigo-500': selectedPlanId === plan.id }"
          @click="selectPlan(plan.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">{{ plan.title }}</h3>
            <CommonStatusBadge :status="plan.status" type="plan" />
          </div>
          <div class="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span>{{ plan.totalChapters }}章</span>
            <span>{{ formatTimestamp(plan.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Plan detail -->
      <div
        v-if="selectedPlanId"
        class="flex-1 min-w-0"
      >
        <!-- Mobile back button -->
        <button
          class="lg:hidden btn-secondary btn-sm mb-4"
          @click="selectedPlanId = null"
        >
          <svg class="w-4 h-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          一覧に戻る
        </button>

        <CommonLoadingSpinner v-if="detailLoading" text="計画の詳細を読み込み中..." />

        <template v-else-if="currentPlan">
          <!-- Plan header -->
          <div class="card">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 flex-wrap">
                  <h3 class="text-lg font-bold text-gray-900">{{ currentPlan.title }}</h3>
                  <CommonStatusBadge :status="currentPlan.status" type="plan" />
                </div>
                <p class="mt-1 text-xs text-gray-500">
                  {{ currentPlan.totalChapters }}章 / 作成日: {{ formatTimestamp(currentPlan.createdAt) }}
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button
                  v-if="currentPlan.status === 'draft'"
                  class="btn-primary btn-sm"
                  @click="handleApprove"
                >
                  承認する
                </button>
                <button
                  class="btn-danger btn-sm"
                  @click="showDeleteConfirm = true"
                >
                  削除
                </button>
              </div>
            </div>

            <!-- AI Rationale -->
            <div v-if="currentPlan.aiRationale" class="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <div>
                  <p class="text-xs font-semibold text-indigo-800">AIの提案理由</p>
                  <p class="mt-1 text-sm text-indigo-700 whitespace-pre-line">{{ currentPlan.aiRationale }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Chapters -->
          <div class="mt-4 space-y-3">
            <h4 class="text-sm font-semibold text-gray-700">チャプター一覧（{{ chapters.length }}件）</h4>

            <div
              v-for="(chapter, index) in chapters"
              :key="chapter.id"
              class="card"
            >
              <div class="flex items-start gap-3">
                <!-- Chapter number -->
                <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                  {{ chapter.chapterNumber }}
                </div>

                <!-- Chapter content -->
                <div class="flex-1 min-w-0">
                  <!-- View mode -->
                  <template v-if="editingChapterId !== chapter.id">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <h5 class="text-sm font-semibold text-gray-900">{{ chapter.title }}</h5>
                        <p class="mt-1 text-sm text-gray-600 whitespace-pre-line">{{ chapter.synopsis }}</p>
                      </div>
                      <CommonStatusBadge :status="chapter.status" type="chapter" />
                    </div>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        class="btn-secondary btn-sm"
                        @click="startEditChapter(chapter)"
                      >
                        編集
                      </button>
                      <!-- Reorder buttons -->
                      <button
                        v-if="index > 0"
                        class="btn-secondary btn-sm"
                        title="上に移動"
                        @click="moveChapter(index, 'up')"
                      >
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        v-if="index < chapters.length - 1"
                        class="btn-secondary btn-sm"
                        title="下に移動"
                        @click="moveChapter(index, 'down')"
                      >
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </template>

                  <!-- Edit mode -->
                  <template v-else>
                    <div class="space-y-3">
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">タイトル</label>
                        <input
                          v-model="editForm.title"
                          type="text"
                          class="input-field"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">あらすじ</label>
                        <textarea
                          v-model="editForm.synopsis"
                          rows="3"
                          class="input-field"
                        />
                      </div>
                      <div class="flex items-center gap-2">
                        <button class="btn-primary btn-sm" :disabled="savingChapter" @click="saveChapter(chapter.id)">
                          <CommonLoadingSpinner v-if="savingChapter" size="sm" />
                          <span v-else>保存</span>
                        </button>
                        <button class="btn-secondary btn-sm" @click="cancelEditChapter">キャンセル</button>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <CommonEmptyState
              v-if="chapters.length === 0"
              title="チャプターがありません"
              description="この計画にはチャプターが登録されていません"
            />
          </div>
        </template>
      </div>

      <!-- No plan selected (desktop) -->
      <div
        v-else
        class="hidden lg:flex flex-1 items-center justify-center"
      >
        <p class="text-sm text-gray-400">左の一覧から配信計画を選択してください</p>
      </div>
    </div>

    <!-- Generate Plan Modal -->
    <Teleport to="body">
      <div v-if="showGenerateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" @click="closeGenerateModal" />
        <div class="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">配信計画を生成</h2>

          <!-- Generating animation -->
          <div v-if="generating" class="py-12 text-center">
            <div class="relative mx-auto w-16 h-16 mb-6">
              <div class="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div class="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
              <svg class="absolute inset-3 w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p class="text-sm font-semibold text-gray-900">AIが配信計画を生成中...</p>
            <p class="mt-2 text-xs text-gray-500">コンテンツを分析し、最適なチャプター構成を検討しています</p>
            <div class="mt-4 flex justify-center gap-1">
              <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>

          <!-- Form -->
          <form v-else @submit.prevent="handleGenerate" class="space-y-5">
            <!-- Content sources info -->
            <div>
              <CommonLoadingSpinner v-if="contentsLoading" size="sm" text="コンテンツを読み込み中..." />
              <template v-else>
                <div v-if="contents.length > 0" class="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p class="text-xs font-medium text-gray-700">
                    プロジェクト内のコンテンツソース（{{ contents.length }}件）を自動的に参照します
                  </p>
                  <ul class="mt-2 space-y-1">
                    <li
                      v-for="content in contents"
                      :key="content.id"
                      class="text-xs text-gray-600 flex items-center gap-1.5"
                    >
                      <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />
                      {{ content.title }}（{{ sourceTypeLabel(content.sourceType) }}）
                    </li>
                  </ul>
                </div>
                <div v-else class="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p class="text-xs text-amber-700">
                    コンテンツソースがありません。先にコンテンツをアップロードしてください。
                  </p>
                </div>
              </template>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">要求・指示（任意）</label>
              <textarea
                v-model="generateForm.userRequirements"
                rows="4"
                class="input-field"
                placeholder="例: 初心者向けにSNSマーケティングの基礎を5回連載で解説してください"
              />
              <p class="mt-1 text-xs text-gray-500">
                未指定の場合、AIがアップロード済みコンテンツをもとに最適な計画を自動判断します
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">チャプター数（任意）</label>
              <input
                v-model.number="generateForm.suggestedChapters"
                type="number"
                min="1"
                max="100"
                class="input-field"
                placeholder="未指定の場合はAIが最適な数を判断します"
              />
              <p class="mt-1 text-xs text-gray-500">未指定の場合、AIがコンテンツ量に応じて自動判断します</p>
            </div>

            <div v-if="generateError" class="p-3 rounded-lg bg-red-50 text-sm text-red-700">
              {{ generateError }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" class="btn-secondary" @click="closeGenerateModal">キャンセル</button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="contents.length === 0"
              >
                生成する
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm Dialog -->
    <CommonConfirmDialog
      v-model="showDeleteConfirm"
      title="配信計画を削除"
      message="この配信計画と関連するすべてのチャプターが削除されます。この操作は取り消せません。"
      confirm-text="削除する"
      danger
      @confirm="handleDelete"
    />

    <!-- Operation error banner -->
    <Teleport to="body">
      <div
        v-if="operationError"
        class="fixed top-4 right-4 z-50 max-w-sm bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg"
      >
        <div class="flex items-start gap-3">
          <p class="text-sm text-red-700 flex-1">{{ operationError }}</p>
          <button class="text-red-400 hover:text-red-600" @click="operationError = ''">
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
import type { PlanChapter, ContentSourceType } from '~/types'

const route = useRoute()
const projectId = computed(() => route.params.projectId as string)

const {
  plans,
  currentPlan,
  chapters,
  plansLoading,
  generating,
  fetchPlans,
  fetchPlan,
  fetchChapters,
  generatePlan,
  updatePlanStatus,
  updateChapter,
  reorderChapters,
  deletePlan,
} = usePlans()

const { contents, contentsLoading, fetchContents } = useContents()

// ==========================================
// State
// ==========================================

const selectedPlanId = ref<string | null>(null)
const detailLoading = ref(false)
const showGenerateModal = ref(false)
const showDeleteConfirm = ref(false)
const editingChapterId = ref<string | null>(null)
const savingChapter = ref(false)
const generateError = ref('')
const operationError = ref('')

const generateForm = ref({
  userRequirements: '',
  suggestedChapters: undefined as number | undefined,
})

const editForm = ref({
  title: '',
  synopsis: '',
})

// ==========================================
// Lifecycle
// ==========================================

onMounted(async () => {
  await Promise.all([
    fetchPlans(projectId.value),
    fetchContents(projectId.value),
  ])
})

// ==========================================
// Plan selection
// ==========================================

const selectPlan = async (planId: string) => {
  selectedPlanId.value = planId
  detailLoading.value = true
  try {
    await Promise.all([
      fetchPlan(planId),
      fetchChapters(planId),
    ])
  } finally {
    detailLoading.value = false
  }
}

// ==========================================
// Generate plan
// ==========================================

const handleGenerate = async () => {
  generateError.value = ''
  try {
    const result = await generatePlan(
      projectId.value,
      generateForm.value.userRequirements || undefined,
      generateForm.value.suggestedChapters || undefined,
    )
    closeGenerateModal()
    // Select the newly created plan
    await selectPlan(result.plan.id)
  } catch {
    generateError.value = '配信計画の生成に失敗しました。しばらくしてから再度お試しください。'
  }
}

const closeGenerateModal = () => {
  if (generating.value) return
  showGenerateModal.value = false
  generateForm.value = { userRequirements: '', suggestedChapters: undefined }
  generateError.value = ''
}

// ==========================================
// Approve plan
// ==========================================

const handleApprove = async () => {
  if (!currentPlan.value) return
  try {
    await updatePlanStatus(currentPlan.value.id, 'approved')
    await fetchPlans(projectId.value)
  } catch {
    operationError.value = '計画の承認に失敗しました'
  }
}

// ==========================================
// Delete plan
// ==========================================

const handleDelete = async () => {
  if (!currentPlan.value) return
  const planId = currentPlan.value.id
  showDeleteConfirm.value = false
  try {
    await deletePlan(planId, projectId.value)
    selectedPlanId.value = null
  } catch {
    operationError.value = '計画の削除に失敗しました'
  }
}

// ==========================================
// Chapter editing
// ==========================================

const startEditChapter = (chapter: PlanChapter) => {
  editingChapterId.value = chapter.id
  editForm.value = {
    title: chapter.title,
    synopsis: chapter.synopsis,
  }
}

const cancelEditChapter = () => {
  editingChapterId.value = null
  editForm.value = { title: '', synopsis: '' }
}

const saveChapter = async (chapterId: string) => {
  savingChapter.value = true
  try {
    await updateChapter(chapterId, {
      title: editForm.value.title,
      synopsis: editForm.value.synopsis,
    })
    // Refresh chapters to reflect the change
    if (selectedPlanId.value) {
      await fetchChapters(selectedPlanId.value)
    }
    editingChapterId.value = null
  } catch {
    operationError.value = '章の保存に失敗しました'
  } finally {
    savingChapter.value = false
  }
}

// ==========================================
// Chapter reordering
// ==========================================

const moveChapter = async (index: number, direction: 'up' | 'down') => {
  if (!selectedPlanId.value) return
  const ordered = [...chapters.value]
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= ordered.length) return
  // Swap
  const temp = ordered[index]
  ordered[index] = ordered[targetIndex]
  ordered[targetIndex] = temp
  const orderedIds = ordered.map((c) => c.id)
  try {
    await reorderChapters(selectedPlanId.value, orderedIds)
  } catch {
    operationError.value = '章の並び替えに失敗しました'
  }
}

// ==========================================
// Helpers
// ==========================================

const formatTimestamp = (timestamp: Timestamp) => {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const sourceTypeLabel = (type: ContentSourceType): string => {
  const labels: Record<ContentSourceType, string> = {
    text: 'テキスト',
    pdf: 'PDF',
    markdown: 'Markdown',
    url: 'URL',
  }
  return labels[type] || type
}
</script>
