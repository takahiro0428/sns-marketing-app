<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">記事管理</h2>
        <p class="mt-1 text-sm text-gray-600">AIで生成した記事の編集・投稿を管理します</p>
      </div>
      <button class="btn-primary" @click="openGenerateModal">
        <svg class="w-4 h-4 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        記事を生成
      </button>
    </div>

    <!-- Throttle status bar -->
    <div v-if="throttleStatus" class="card border-amber-200 bg-amber-50">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-sm font-medium text-amber-800">Anti-BAN スロットル状況</span>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-amber-700">
          <span>本日: {{ throttleStatus.todayCount }} / {{ throttleStatus.dailyLimit }} 件</span>
          <span>今週: {{ throttleStatus.weekCount }} / {{ throttleStatus.weeklyLimit }} 件</span>
          <span
            :class="throttleStatus.canPost ? 'text-green-700' : 'text-red-700'"
            class="font-semibold"
          >
            {{ throttleStatus.canPost ? '投稿可能' : '制限中' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="card border-red-200 bg-red-50">
      <div class="flex items-center justify-between">
        <p class="text-sm text-red-700">{{ errorMessage }}</p>
        <button class="text-red-500 hover:text-red-700" @click="errorMessage = ''">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Success message -->
    <div v-if="successMessage" class="card border-green-200 bg-green-50">
      <div class="flex items-center justify-between">
        <p class="text-sm text-green-700">{{ successMessage }}</p>
        <button class="text-green-500 hover:text-green-700" @click="successMessage = ''">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <CommonLoadingSpinner v-if="articlesLoading" full-page text="記事を読み込み中..." />

    <!-- Empty state -->
    <CommonEmptyState
      v-else-if="articles.length === 0"
      title="記事がありません"
      description="承認済みの配信計画からチャプターを選択して、AIに記事を生成してもらいましょう"
      icon="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
    >
      <template #action>
        <button class="btn-primary" @click="openGenerateModal">記事を生成</button>
      </template>
    </CommonEmptyState>

    <!-- Articles list + Detail split view -->
    <div v-else class="flex flex-col lg:flex-row gap-6">
      <!-- Article list -->
      <div
        class="w-full lg:w-80 lg:shrink-0 space-y-3"
        :class="{ 'hidden lg:block': selectedArticleId }"
      >
        <div
          v-for="article in articles"
          :key="article.id"
          class="card cursor-pointer transition-all hover:shadow-md"
          :class="{ 'ring-2 ring-indigo-500': selectedArticleId === article.id }"
          @click="selectArticle(article.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">{{ article.title }}</h3>
            <CommonStatusBadge :status="article.status" type="article" />
          </div>

          <!-- Platform post status icons -->
          <div class="mt-2 flex items-center gap-3">
            <span
              class="inline-flex items-center gap-1 text-xs"
              :class="article.notePostId ? 'text-green-600' : 'text-gray-400'"
            >
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
              </svg>
              Note
            </span>
            <span
              class="inline-flex items-center gap-1 text-xs"
              :class="article.xPostId ? 'text-green-600' : 'text-gray-400'"
            >
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
              </svg>
              X
            </span>
          </div>

          <div class="mt-2 text-xs text-gray-500">
            {{ formatTimestamp(article.createdAt) }}
          </div>
        </div>
      </div>

      <!-- Article detail -->
      <div
        v-if="selectedArticleId"
        class="flex-1 min-w-0"
      >
        <!-- Mobile back button -->
        <button
          class="lg:hidden btn-secondary btn-sm mb-4"
          @click="selectedArticleId = null"
        >
          <svg class="w-4 h-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          一覧に戻る
        </button>

        <CommonLoadingSpinner v-if="detailLoading" text="記事の詳細を読み込み中..." />

        <template v-else-if="currentArticle">
          <!-- Article header card -->
          <div class="card">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 flex-wrap">
                  <CommonStatusBadge :status="currentArticle.status" type="article" />
                </div>
                <p class="mt-1 text-xs text-gray-500">
                  作成日: {{ formatTimestamp(currentArticle.createdAt) }}
                  <template v-if="currentArticle.updatedAt">
                    / 更新日: {{ formatTimestamp(currentArticle.updatedAt) }}
                  </template>
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <!-- Post buttons -->
                <button
                  class="btn-primary btn-sm"
                  :disabled="posting || !throttleStatus?.canPost || !!currentArticle.notePostId"
                  @click="handlePost('note')"
                >
                  <CommonLoadingSpinner v-if="postingPlatform === 'note'" size="sm" />
                  <span v-else>{{ currentArticle.notePostId ? 'Note投稿済' : 'Noteに投稿' }}</span>
                </button>
                <button
                  class="btn-primary btn-sm"
                  :disabled="posting || !throttleStatus?.canPost || !!currentArticle.xPostId"
                  @click="handlePost('x')"
                >
                  <CommonLoadingSpinner v-if="postingPlatform === 'x'" size="sm" />
                  <span v-else>{{ currentArticle.xPostId ? 'X投稿済' : 'Xに投稿' }}</span>
                </button>
                <button
                  class="btn-danger btn-sm"
                  @click="showDeleteConfirm = true"
                >
                  削除
                </button>
              </div>
            </div>

            <!-- Post status info -->
            <div v-if="currentArticle.notePostUrl || currentArticle.xPostUrl" class="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <p class="text-xs font-semibold text-green-800 mb-1">投稿済みリンク</p>
              <div class="space-y-1">
                <p v-if="currentArticle.notePostUrl" class="text-xs text-green-700">
                  Note:
                  <a :href="currentArticle.notePostUrl" target="_blank" rel="noopener noreferrer" class="underline hover:text-green-900">
                    {{ currentArticle.notePostUrl }}
                  </a>
                </p>
                <p v-if="currentArticle.xPostUrl" class="text-xs text-green-700">
                  X:
                  <a :href="currentArticle.xPostUrl" target="_blank" rel="noopener noreferrer" class="underline hover:text-green-900">
                    {{ currentArticle.xPostUrl }}
                  </a>
                </p>
              </div>
            </div>

            <!-- Post error display -->
            <div v-if="postError" class="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
              <p class="text-xs font-semibold text-red-800">投稿エラー</p>
              <p class="mt-1 text-sm text-red-700">{{ postError }}</p>
            </div>
          </div>

          <!-- Edit / Preview toggle -->
          <div class="mt-4 flex items-center gap-2 border-b border-gray-200">
            <button
              class="px-4 py-2 text-sm font-medium transition-colors"
              :class="viewMode === 'edit' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'"
              @click="viewMode = 'edit'"
            >
              編集
            </button>
            <button
              class="px-4 py-2 text-sm font-medium transition-colors"
              :class="viewMode === 'preview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'"
              @click="viewMode = 'preview'"
            >
              プレビュー
            </button>
          </div>

          <!-- Edit mode -->
          <div v-if="viewMode === 'edit'" class="mt-4 space-y-4">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input
                v-model="editForm.title"
                type="text"
                class="input-field"
                placeholder="記事のタイトル"
              />
            </div>

            <!-- Body -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">本文（Markdown）</label>
              <textarea
                v-model="editForm.body"
                class="input-field min-h-[300px] resize-y font-mono text-sm"
                placeholder="Markdownで本文を記述してください"
              />
            </div>

            <!-- Summary -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">要約</label>
              <textarea
                v-model="editForm.summary"
                rows="3"
                class="input-field resize-y"
                placeholder="記事の要約（SNS投稿時の説明文にも使用）"
              />
            </div>

            <!-- Tags -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">タグ</label>
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span
                  v-for="(tag, idx) in editForm.tags"
                  :key="idx"
                  class="badge-neutral text-xs inline-flex items-center gap-1"
                >
                  {{ tag }}
                  <button
                    type="button"
                    class="text-gray-400 hover:text-gray-600"
                    @click="removeTag(idx)"
                  >
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="newTagInput"
                  type="text"
                  class="input-field flex-1"
                  placeholder="タグを入力してEnterで追加"
                  @keydown.enter.prevent="addTag"
                />
                <button type="button" class="btn-secondary btn-sm" @click="addTag">追加</button>
              </div>
            </div>

            <!-- Save button -->
            <div class="flex justify-end gap-3 pt-2">
              <button
                class="btn-primary"
                :disabled="savingArticle || !editForm.title.trim()"
                @click="handleSave"
              >
                <CommonLoadingSpinner v-if="savingArticle" size="sm" />
                <span v-else>保存</span>
              </button>
            </div>
          </div>

          <!-- Preview mode -->
          <div v-else class="mt-4">
            <div class="card">
              <h1 class="text-2xl font-bold text-gray-900 mb-4">{{ editForm.title }}</h1>

              <!-- Tags -->
              <div v-if="editForm.tags.length > 0" class="flex flex-wrap gap-1 mb-4">
                <span
                  v-for="(tag, idx) in editForm.tags"
                  :key="idx"
                  class="badge-neutral text-xs"
                >
                  #{{ tag }}
                </span>
              </div>

              <!-- Summary -->
              <div v-if="editForm.summary" class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p class="text-xs font-semibold text-gray-500 mb-1">要約</p>
                <p class="text-sm text-gray-700">{{ editForm.summary }}</p>
              </div>

              <!-- Rendered body -->
              <div
                class="prose prose-sm max-w-none text-gray-800"
                v-html="renderedBody"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- No article selected (desktop) -->
      <div
        v-else
        class="hidden lg:flex flex-1 items-center justify-center"
      >
        <p class="text-sm text-gray-400">左の一覧から記事を選択してください</p>
      </div>
    </div>

    <!-- Generate Article Modal -->
    <Teleport to="body">
      <div v-if="showGenerateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" @click="closeGenerateModal" />
        <div class="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">記事を生成</h2>

          <!-- Generating animation -->
          <div v-if="generatingArticle" class="py-12 text-center">
            <div class="relative mx-auto w-16 h-16 mb-6">
              <div class="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div class="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
              <svg class="absolute inset-3 w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p class="text-sm font-semibold text-gray-900">AIが記事を生成中...</p>
            <p class="mt-2 text-xs text-gray-500">チャプターの内容をもとに記事を作成しています</p>
            <div class="mt-4 flex justify-center gap-1">
              <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>

          <!-- Form -->
          <form v-else @submit.prevent="handleGenerate" class="space-y-5">
            <!-- Plan selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">配信計画 *</label>
              <CommonLoadingSpinner v-if="plansLoading" size="sm" text="配信計画を読み込み中..." />
              <template v-else>
                <select
                  v-model="generateForm.planId"
                  required
                  class="input-field"
                  @change="handlePlanChange"
                >
                  <option value="" disabled>選択してください</option>
                  <option
                    v-for="plan in approvedPlans"
                    :key="plan.id"
                    :value="plan.id"
                  >
                    {{ plan.title }}（{{ plan.totalChapters }}章）
                  </option>
                </select>
                <p v-if="approvedPlans.length === 0" class="mt-1 text-xs text-amber-600">
                  承認済みの配信計画がありません。先に計画を承認してください。
                </p>
              </template>
            </div>

            <!-- Chapter selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">チャプター *</label>
              <CommonLoadingSpinner v-if="chaptersLoading" size="sm" text="チャプターを読み込み中..." />
              <template v-else-if="generateForm.planId">
                <select
                  v-model="generateForm.chapterId"
                  required
                  class="input-field"
                >
                  <option value="" disabled>選択してください</option>
                  <option
                    v-for="chapter in selectableChapters"
                    :key="chapter.id"
                    :value="chapter.id"
                  >
                    第{{ chapter.chapterNumber }}章: {{ chapter.title }}
                  </option>
                </select>
                <p v-if="selectableChapters.length === 0" class="mt-1 text-xs text-amber-600">
                  選択可能なチャプターがありません。すべてのチャプターが記事生成済みの可能性があります。
                </p>
              </template>
              <p v-else class="text-xs text-gray-500">先に配信計画を選択してください</p>
            </div>

            <div v-if="generateError" class="p-3 rounded-lg bg-red-50 text-sm text-red-700">
              {{ generateError }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" class="btn-secondary" @click="closeGenerateModal">キャンセル</button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="!generateForm.planId || !generateForm.chapterId"
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
      title="記事を削除"
      message="この記事を削除しますか？この操作は取り消せません。"
      confirm-text="削除する"
      danger
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { Timestamp } from 'firebase/firestore'
import type { ArticleGenerationRequest, PlanChapter, PostPlatform } from '~/types'

const route = useRoute()
const projectId = computed(() => route.params.projectId as string)

const {
  articles,
  currentArticle,
  articlesLoading,
  generatingArticle,
  fetchArticles,
  fetchArticle,
  generateArticle,
  updateArticle,
  updateArticlePostStatus,
  deleteArticle,
} = useArticles()

const {
  plans,
  chapters,
  plansLoading,
  fetchPlans,
  fetchChapters,
} = usePlans()

const postLogsComposable = usePostLogs()
const {
  postLogs,
  posting,
  postArticle,
} = postLogsComposable

// ==========================================
// State
// ==========================================

const selectedArticleId = ref<string | null>(null)
const detailLoading = ref(false)
const showGenerateModal = ref(false)
const showDeleteConfirm = ref(false)
const viewMode = ref<'edit' | 'preview'>('edit')
const savingArticle = ref(false)
const chaptersLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const generateError = ref('')
const postError = ref('')
const postingPlatform = ref<PostPlatform | null>(null)
const newTagInput = ref('')

const generateForm = ref({
  planId: '',
  chapterId: '',
})

const editForm = ref({
  title: '',
  body: '',
  summary: '',
  tags: [] as string[],
})

// ==========================================
// Computed
// ==========================================

const approvedPlans = computed(() =>
  plans.value.filter((p) => p.status === 'approved'),
)

const selectableChapters = computed(() =>
  chapters.value.filter((c) => !c.articleId),
)

const selectedPlan = computed(() =>
  plans.value.find((p) => p.id === generateForm.value.planId),
)

const throttleStatus = computed(() => {
  const dailyLimit = 5
  const weeklyLimit = 20

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const todayCount = postLogs.value.filter((log) => {
    if (log.status !== 'success' || !log.postedAt) return false
    const postedDate = log.postedAt.toDate ? log.postedAt.toDate() : new Date(log.postedAt as unknown as string)
    return postedDate >= todayStart
  }).length

  const weekCount = postLogs.value.filter((log) => {
    if (log.status !== 'success' || !log.postedAt) return false
    const postedDate = log.postedAt.toDate ? log.postedAt.toDate() : new Date(log.postedAt as unknown as string)
    return postedDate >= weekStart
  }).length

  return {
    todayCount,
    weekCount,
    dailyLimit,
    weeklyLimit,
    canPost: todayCount < dailyLimit && weekCount < weeklyLimit,
  }
})

/** Simple markdown to HTML renderer */
const renderedBody = computed(() => {
  if (!editForm.value.body) return ''
  let html = editForm.value.body
  // Escape HTML entities
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
  // Code blocks
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.replace(/```\w*\n?/, '').replace(/\n?```$/, '')
    return `<pre class="bg-gray-100 p-3 rounded-lg overflow-x-auto text-sm"><code>${code}</code></pre>`
  })
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">$1</blockquote>')
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-5 space-y-1">$&</ul>')
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-4 border-gray-300" />')
  // Links (sanitize: only allow http/https protocols to prevent XSS via javascript: URIs)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    if (/^https?:\/\//.test(url)) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline">${text}</a>`
    }
    return text
  })
  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p class="mb-3">')
  // Single newlines to <br>
  html = html.replace(/\n/g, '<br>')
  // Wrap in paragraph
  html = `<p class="mb-3">${html}</p>`
  return html
})

// ==========================================
// Lifecycle
// ==========================================

onMounted(async () => {
  await Promise.all([
    fetchArticles(projectId.value),
    fetchPlans(projectId.value),
    fetchPostLogsData(),
  ])
})

const fetchPostLogsData = async () => {
  try {
    await postLogsComposable.fetchPostLogs(projectId.value)
  } catch {
    // Non-blocking: throttle status may be inaccurate
  }
}

// ==========================================
// Article selection
// ==========================================

const selectArticle = async (articleId: string) => {
  selectedArticleId.value = articleId
  detailLoading.value = true
  viewMode.value = 'edit'
  postError.value = ''
  try {
    await fetchArticle(articleId)
    if (currentArticle.value) {
      editForm.value = {
        title: currentArticle.value.title,
        body: currentArticle.value.body,
        summary: currentArticle.value.summary,
        tags: [...currentArticle.value.tags],
      }
    }
  } finally {
    detailLoading.value = false
  }
}

// ==========================================
// Generate article
// ==========================================

const openGenerateModal = () => {
  showGenerateModal.value = true
  generateForm.value = { planId: '', chapterId: '' }
  generateError.value = ''
}

const closeGenerateModal = () => {
  if (generatingArticle.value) return
  showGenerateModal.value = false
  generateForm.value = { planId: '', chapterId: '' }
  generateError.value = ''
}

const handlePlanChange = async () => {
  generateForm.value.chapterId = ''
  if (!generateForm.value.planId) return
  chaptersLoading.value = true
  try {
    await fetchChapters(generateForm.value.planId)
  } finally {
    chaptersLoading.value = false
  }
}

const handleGenerate = async () => {
  generateError.value = ''
  const selectedChapter = chapters.value.find((c) => c.id === generateForm.value.chapterId)
  if (!selectedChapter || !selectedPlan.value) return

  const request: ArticleGenerationRequest = {
    projectId: projectId.value,
    planId: generateForm.value.planId,
    chapterId: generateForm.value.chapterId,
    contentSourceId: selectedPlan.value.contentSourceId,
    chapterTitle: selectedChapter.title,
    chapterSynopsis: selectedChapter.synopsis,
  }

  try {
    const article = await generateArticle(request)
    closeGenerateModal()
    successMessage.value = '記事が生成されました'
    await selectArticle(article.id)
  } catch {
    generateError.value = '記事の生成に失敗しました。しばらくしてから再度お試しください。'
  }
}

// ==========================================
// Save article
// ==========================================

const handleSave = async () => {
  if (!currentArticle.value || !editForm.value.title.trim()) return
  savingArticle.value = true
  errorMessage.value = ''
  try {
    await updateArticle(currentArticle.value.id, {
      title: editForm.value.title.trim(),
      body: editForm.value.body,
      summary: editForm.value.summary.trim(),
      tags: editForm.value.tags,
    })
    successMessage.value = '記事を保存しました'
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    errorMessage.value = `記事の保存に失敗しました: ${message}`
  } finally {
    savingArticle.value = false
  }
}

// ==========================================
// Post article
// ==========================================

const handlePost = async (platform: PostPlatform) => {
  if (!currentArticle.value) return
  if (!throttleStatus.value?.canPost) {
    postError.value = '投稿制限に達しています。時間を空けてから再度お試しください。'
    return
  }

  postingPlatform.value = platform
  postError.value = ''
  try {
    const result = await postArticle(currentArticle.value.id, projectId.value, platform)
    await updateArticlePostStatus(
      currentArticle.value.id,
      platform,
      result.externalPostId || '',
      result.externalPostUrl || '',
    )
    await fetchArticles(projectId.value)
    successMessage.value = `${platform === 'note' ? 'Note' : 'X'}への投稿が完了しました`
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    postError.value = `${platform === 'note' ? 'Note' : 'X'}への投稿に失敗しました: ${message}`
  } finally {
    postingPlatform.value = null
  }
}

// ==========================================
// Delete article
// ==========================================

const handleDelete = async () => {
  if (!currentArticle.value) return
  const articleId = currentArticle.value.id
  showDeleteConfirm.value = false
  errorMessage.value = ''
  try {
    await deleteArticle(articleId, projectId.value)
    selectedArticleId.value = null
    editForm.value = { title: '', body: '', summary: '', tags: [] }
    successMessage.value = '記事を削除しました'
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    errorMessage.value = `記事の削除に失敗しました: ${message}`
  }
}

// ==========================================
// Tags management
// ==========================================

const addTag = () => {
  const tag = newTagInput.value.trim()
  if (tag && !editForm.value.tags.includes(tag)) {
    editForm.value.tags.push(tag)
  }
  newTagInput.value = ''
}

const removeTag = (index: number) => {
  editForm.value.tags.splice(index, 1)
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
</script>
