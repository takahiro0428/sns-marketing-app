<template>
  <div>
    <CommonLoadingSpinner v-if="contentsLoading && contents.length === 0" full-page text="コンテンツを読み込み中..." />

    <div v-else class="space-y-6">
      <!-- Page header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">コンテンツ管理</h2>
          <p class="mt-1 text-sm text-gray-600">元ネタとなるファイルやテキストを管理します</p>
        </div>
        <button class="btn-primary" @click="showTextInputModal = true">
          <svg class="w-4 h-4 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          テキストを入力
        </button>
      </div>

      <!-- Upload area -->
      <div
        class="card border-2 border-dashed transition-colors cursor-pointer"
        :class="isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleFileDrop"
        @click="triggerFileInput"
      >
        <div class="flex flex-col items-center justify-center py-8">
          <svg class="w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-sm font-medium text-gray-700">ファイルをドラッグ&ドロップ、またはクリックして選択</p>
          <p class="text-xs text-gray-500 mt-1">対応形式: .txt, .md, .pdf</p>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          class="hidden"
          accept=".txt,.md,.pdf"
          multiple
          @change="handleFileSelect"
        />
      </div>

      <!-- Upload progress -->
      <div v-if="uploading" class="card">
        <div class="flex items-center gap-3">
          <CommonLoadingSpinner size="sm" />
          <span class="text-sm text-gray-600">アップロード中...</span>
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

      <!-- Content list -->
      <CommonEmptyState
        v-if="contents.length === 0"
        title="コンテンツがありません"
        description="ファイルをアップロードするか、テキストを直接入力してください"
        icon="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      >
        <template #action>
          <button class="btn-primary" @click="showTextInputModal = true">テキストを入力</button>
        </template>
      </CommonEmptyState>

      <div v-else class="space-y-3">
        <div
          v-for="content in contents"
          :key="content.id"
          class="card hover:shadow-md transition-shadow"
        >
          <div class="flex flex-col sm:flex-row sm:items-start gap-4">
            <!-- Content info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-semibold text-gray-900 truncate">{{ content.title }}</h3>
                <span :class="sourceTypeBadgeClass(content.sourceType)">
                  {{ sourceTypeLabel(content.sourceType) }}
                </span>
              </div>

              <!-- Tags -->
              <div v-if="content.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="tag in content.tags"
                  :key="tag"
                  class="badge-neutral text-xs"
                >
                  {{ tag }}
                </span>
              </div>

              <!-- Metadata -->
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                <span v-if="content.originalFileName" class="truncate max-w-[200px]">
                  {{ content.originalFileName }}
                </span>
                <span>{{ formatFileSize(content.rawText) }}</span>
                <span>{{ countWords(content.rawText) }} 文字</span>
                <span>{{ formatTimestamp(content.createdAt) }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <button class="btn-secondary btn-sm" @click="openEditModal(content)">
                編集
              </button>
              <button class="btn-danger btn-sm" @click="confirmDelete(content)">
                削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Text input modal -->
    <Teleport to="body">
      <div v-if="showTextInputModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" @click="closeTextInputModal" />
        <div class="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">テキストを入力</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input
                v-model="textInputForm.title"
                type="text"
                class="input-field"
                placeholder="コンテンツのタイトルを入力"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">本文</label>
              <textarea
                v-model="textInputForm.text"
                class="input-field min-h-[200px] resize-y"
                placeholder="元ネタとなるテキストを入力してください"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">タグ（カンマ区切り）</label>
              <input
                v-model="textInputForm.tagsInput"
                type="text"
                class="input-field"
                placeholder="例: マーケティング, SNS, 分析"
              />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button class="btn-secondary" @click="closeTextInputModal">キャンセル</button>
            <button
              class="btn-primary"
              :disabled="!textInputForm.title.trim() || !textInputForm.text.trim() || uploading"
              @click="submitTextContent"
            >
              <CommonLoadingSpinner v-if="uploading" size="sm" />
              <span v-else>保存</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" @click="closeEditModal" />
        <div class="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">コンテンツを編集</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input
                v-model="editForm.title"
                type="text"
                class="input-field"
                placeholder="タイトル"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">タグ（カンマ区切り）</label>
              <input
                v-model="editForm.tagsInput"
                type="text"
                class="input-field"
                placeholder="例: マーケティング, SNS, 分析"
              />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button class="btn-secondary" @click="closeEditModal">キャンセル</button>
            <button
              class="btn-primary"
              :disabled="!editForm.title.trim() || saving"
              @click="submitEdit"
            >
              <CommonLoadingSpinner v-if="saving" size="sm" />
              <span v-else>保存</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirmation -->
    <CommonConfirmDialog
      v-model="showDeleteDialog"
      title="コンテンツを削除"
      :message="`「${deleteTarget?.title}」を削除しますか？この操作は取り消せません。`"
      confirm-text="削除する"
      :danger="true"
      @confirm="executeDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { Timestamp } from 'firebase/firestore'

const route = useRoute()
const projectId = computed(() => route.params.projectId as string)

const {
  contents,
  contentsLoading,
  fetchContents,
  uploadContent,
  uploadTextContent,
  updateContent,
  deleteContent,
} = useContents()

// --- State ---
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const uploading = ref(false)
const saving = ref(false)
const errorMessage = ref('')

// Text input modal
const showTextInputModal = ref(false)
const textInputForm = reactive({
  title: '',
  text: '',
  tagsInput: '',
})

// Edit modal
const showEditModal = ref(false)
const editTargetId = ref('')
const editForm = reactive({
  title: '',
  tagsInput: '',
})

// Delete dialog
const showDeleteDialog = ref(false)
const deleteTarget = ref<{ id: string; title: string } | null>(null)

// --- Constants ---
const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// --- Lifecycle ---
onMounted(async () => {
  await fetchContents(projectId.value)
})

// --- File upload ---
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files) {
    processFiles(Array.from(input.files))
  }
  // Reset input so same file can be re-selected
  input.value = ''
}

function handleFileDrop(event: DragEvent) {
  isDragOver.value = false
  if (event.dataTransfer?.files) {
    processFiles(Array.from(event.dataTransfer.files))
  }
}

function validateFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return `「${file.name}」は対応していない形式です（対応: ${ACCEPTED_EXTENSIONS.join(', ')}）`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `「${file.name}」のサイズが上限（10MB）を超えています`
  }
  return null
}

async function processFiles(files: File[]) {
  errorMessage.value = ''

  const validationErrors: string[] = []
  const validFiles: File[] = []

  for (const file of files) {
    const error = validateFile(file)
    if (error) {
      validationErrors.push(error)
    } else {
      validFiles.push(file)
    }
  }

  if (validationErrors.length > 0) {
    errorMessage.value = validationErrors.join('、')
  }

  if (validFiles.length === 0) return

  uploading.value = true
  try {
    for (const file of validFiles) {
      const title = file.name.replace(/\.[^.]+$/, '')
      await uploadContent(projectId.value, file, title)
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    errorMessage.value = `アップロードに失敗しました: ${message}`
  } finally {
    uploading.value = false
  }
}

// --- Text input ---
function closeTextInputModal() {
  showTextInputModal.value = false
  textInputForm.title = ''
  textInputForm.text = ''
  textInputForm.tagsInput = ''
}

async function submitTextContent() {
  if (!textInputForm.title.trim() || !textInputForm.text.trim()) return

  const tags = parseTags(textInputForm.tagsInput)

  uploading.value = true
  errorMessage.value = ''
  try {
    await uploadTextContent(projectId.value, textInputForm.title.trim(), textInputForm.text.trim(), tags)
    closeTextInputModal()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    errorMessage.value = `テキストの保存に失敗しました: ${message}`
  } finally {
    uploading.value = false
  }
}

// --- Edit ---
function openEditModal(content: { id: string; title: string; tags: string[] }) {
  editTargetId.value = content.id
  editForm.title = content.title
  editForm.tagsInput = content.tags.join(', ')
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editTargetId.value = ''
  editForm.title = ''
  editForm.tagsInput = ''
}

async function submitEdit() {
  if (!editForm.title.trim()) return

  const tags = parseTags(editForm.tagsInput)

  saving.value = true
  errorMessage.value = ''
  try {
    await updateContent(editTargetId.value, {
      title: editForm.title.trim(),
      tags,
    })
    await fetchContents(projectId.value)
    closeEditModal()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    errorMessage.value = `更新に失敗しました: ${message}`
  } finally {
    saving.value = false
  }
}

// --- Delete ---
function confirmDelete(content: { id: string; title: string }) {
  deleteTarget.value = { id: content.id, title: content.title }
  showDeleteDialog.value = true
}

async function executeDelete() {
  if (!deleteTarget.value) return

  errorMessage.value = ''
  try {
    await deleteContent(deleteTarget.value.id, projectId.value)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    errorMessage.value = `削除に失敗しました: ${message}`
  } finally {
    showDeleteDialog.value = false
    deleteTarget.value = null
  }
}

// --- Helpers ---
function parseTags(input: string): string[] {
  return input
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function sourceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    text: 'テキスト',
    pdf: 'PDF',
    markdown: 'Markdown',
    url: 'URL',
  }
  return map[type] || type
}

function sourceTypeBadgeClass(type: string): string {
  const map: Record<string, string> = {
    text: 'badge-neutral',
    pdf: 'badge-info',
    markdown: 'badge-info',
    url: 'badge-info',
  }
  return map[type] || 'badge-neutral'
}

function formatFileSize(rawText: string | undefined): string {
  if (!rawText) return '0 B'
  const bytes = new Blob([rawText]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function countWords(rawText: string | undefined): number {
  if (!rawText) return 0
  return rawText.length
}

function formatTimestamp(timestamp: Timestamp): string {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleString('ja-JP')
}
</script>
