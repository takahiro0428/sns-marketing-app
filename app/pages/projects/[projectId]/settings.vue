<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-gray-900">プロジェクト設定</h2>
      <p class="text-sm text-gray-600">プロジェクトとプラットフォームの設定を管理</p>
    </div>

    <CommonLoadingSpinner v-if="settingsLoading" full-page text="設定を読み込み中..." />

    <template v-else>
      <!-- Project settings -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">プロジェクト基本設定</h3>
        <form @submit.prevent="handleUpdateProject" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">プロジェクト名</label>
            <input v-model="projectForm.name" type="text" required class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea v-model="projectForm.description" rows="3" class="input-field" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input v-model="projectForm.noteEnabled" type="checkbox" class="w-4 h-4 text-indigo-600 rounded" />
              <div>
                <p class="text-sm font-medium text-gray-900">Note連携</p>
                <p class="text-xs text-gray-500">note.comへの投稿を有効化</p>
              </div>
            </label>
            <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input v-model="projectForm.xEnabled" type="checkbox" class="w-4 h-4 text-indigo-600 rounded" />
              <div>
                <p class="text-sm font-medium text-gray-900">X連携</p>
                <p class="text-xs text-gray-500">X (Twitter)への投稿を有効化</p>
              </div>
            </label>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">投稿間隔（分）</label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-500">最小</label>
                <input v-model.number="projectForm.postingIntervalMinMinutes" type="number" min="30" class="input-field" />
              </div>
              <div>
                <label class="text-xs text-gray-500">最大</label>
                <input v-model.number="projectForm.postingIntervalMaxMinutes" type="number" min="60" class="input-field" />
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-1">BAN回避のため、投稿はこの範囲のランダムな間隔で行われます</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">アクティブ時間帯</label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-500">開始（時）</label>
                <input v-model.number="projectForm.activeHoursStart" type="number" min="0" max="23" class="input-field" />
              </div>
              <div>
                <label class="text-xs text-gray-500">終了（時）</label>
                <input v-model.number="projectForm.activeHoursEnd" type="number" min="1" max="24" class="input-field" />
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-1">この時間帯のみ投稿が行われます</p>
          </div>

          <div v-if="projectError" class="p-3 rounded-lg bg-red-50 text-sm text-red-700">{{ projectError }}</div>
          <div v-if="projectSuccess" class="p-3 rounded-lg bg-green-50 text-sm text-green-700">設定を保存しました</div>

          <div class="flex justify-end">
            <button type="submit" class="btn-primary" :disabled="savingProject">
              <CommonLoadingSpinner v-if="savingProject" size="sm" />
              <span v-else>保存</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Note credentials -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-1">Note認証設定</h3>
        <p class="text-xs text-gray-500 mb-4">note.comのログイン情報を設定します。パスワードは暗号化して保存されます。</p>

        <form @submit.prevent="handleSaveNote" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input v-model="noteForm.email" type="email" class="input-field" placeholder="note.comのメールアドレス" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input v-model="noteForm.password" type="password" class="input-field" placeholder="パスワード" />
          </div>

          <div v-if="noteError" class="p-3 rounded-lg bg-red-50 text-sm text-red-700">{{ noteError }}</div>
          <div v-if="noteSuccess" class="p-3 rounded-lg bg-green-50 text-sm text-green-700">{{ noteSuccess }}</div>

          <div class="flex items-center gap-3">
            <button type="submit" class="btn-primary" :disabled="savingNote">
              <CommonLoadingSpinner v-if="savingNote" size="sm" />
              <span v-else>保存</span>
            </button>
            <button
              type="button"
              class="btn-secondary"
              :disabled="testingNote"
              @click="handleTestNote"
            >
              <CommonLoadingSpinner v-if="testingNote" size="sm" />
              <span v-else>接続テスト</span>
            </button>
            <span v-if="settings?.noteCredentials?.email" class="text-xs text-green-600">
              設定済み: {{ settings.noteCredentials.email }}
            </span>
          </div>
        </form>
      </div>

      <!-- X credentials -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-1">X (Twitter) API設定</h3>
        <p class="text-xs text-gray-500 mb-4">X Developer Portalで取得したAPI認証情報を設定します。</p>

        <form @submit.prevent="handleSaveX" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input v-model="xForm.apiKey" type="text" class="input-field" placeholder="API Key" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
              <input v-model="xForm.apiSecret" type="password" class="input-field" placeholder="API Secret" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
              <input v-model="xForm.accessToken" type="text" class="input-field" placeholder="Access Token" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Access Token Secret</label>
              <input v-model="xForm.accessTokenSecret" type="password" class="input-field" placeholder="Access Token Secret" />
            </div>
          </div>

          <div v-if="xError" class="p-3 rounded-lg bg-red-50 text-sm text-red-700">{{ xError }}</div>
          <div v-if="xSuccess" class="p-3 rounded-lg bg-green-50 text-sm text-green-700">{{ xSuccess }}</div>

          <div class="flex items-center gap-3">
            <button type="submit" class="btn-primary" :disabled="savingX">
              <CommonLoadingSpinner v-if="savingX" size="sm" />
              <span v-else>保存</span>
            </button>
            <button
              type="button"
              class="btn-secondary"
              :disabled="testingX"
              @click="handleTestX"
            >
              <CommonLoadingSpinner v-if="testingX" size="sm" />
              <span v-else>接続テスト</span>
            </button>
            <span v-if="settings?.xCredentials?.apiKey" class="text-xs text-green-600">
              設定済み
            </span>
          </div>
        </form>
      </div>

      <!-- Danger zone -->
      <div class="card border-red-200">
        <h3 class="text-lg font-semibold text-red-600 mb-4">危険な操作</h3>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-gray-900">プロジェクトを削除</p>
            <p class="text-xs text-gray-500">この操作は取り消せません。すべてのデータが削除されます。</p>
          </div>
          <button class="btn-danger btn-sm shrink-0" @click="showDeleteConfirm = true">
            プロジェクトを削除
          </button>
        </div>
      </div>

      <CommonConfirmDialog
        v-model="showDeleteConfirm"
        title="プロジェクトを削除しますか？"
        message="この操作は取り消せません。プロジェクト内のすべてのデータ（コンテンツ、計画、記事、ログ）が完全に削除されます。"
        confirm-text="削除する"
        :danger="true"
        @confirm="handleDeleteProject"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.projectId as string)

const { currentProject, updateProject, deleteProject } = useProjects()
const { settings, settingsLoading, fetchSettings, saveNoteCredentials, saveXCredentials, testNoteConnection, testXConnection } = useSettings()

const showDeleteConfirm = ref(false)
const savingProject = ref(false)
const savingNote = ref(false)
const savingX = ref(false)
const testingNote = ref(false)
const testingX = ref(false)

const projectError = ref('')
const projectSuccess = ref(false)
const noteError = ref('')
const noteSuccess = ref('')
const xError = ref('')
const xSuccess = ref('')

const projectForm = ref({
  name: '',
  description: '',
  noteEnabled: true,
  xEnabled: true,
  postingIntervalMinMinutes: 120,
  postingIntervalMaxMinutes: 480,
  activeHoursStart: 8,
  activeHoursEnd: 22,
})

const noteForm = ref({ email: '', password: '' })
const xForm = ref({ apiKey: '', apiSecret: '', accessToken: '', accessTokenSecret: '' })

watch(currentProject, (p) => {
  if (p) {
    projectForm.value = {
      name: p.name,
      description: p.description,
      noteEnabled: p.noteEnabled,
      xEnabled: p.xEnabled,
      postingIntervalMinMinutes: p.postingIntervalMinMinutes,
      postingIntervalMaxMinutes: p.postingIntervalMaxMinutes,
      activeHoursStart: p.activeHoursStart,
      activeHoursEnd: p.activeHoursEnd,
    }
  }
}, { immediate: true })

const handleUpdateProject = async () => {
  projectError.value = ''
  projectSuccess.value = false
  savingProject.value = true
  try {
    await updateProject(projectId.value, projectForm.value)
    projectSuccess.value = true
    setTimeout(() => { projectSuccess.value = false }, 3000)
  } catch {
    projectError.value = '設定の保存に失敗しました'
  } finally {
    savingProject.value = false
  }
}

const handleSaveNote = async () => {
  noteError.value = ''
  noteSuccess.value = ''
  if (!noteForm.value.email || !noteForm.value.password) {
    noteError.value = 'メールアドレスとパスワードを入力してください'
    return
  }
  savingNote.value = true
  try {
    await saveNoteCredentials(projectId.value, noteForm.value.email, noteForm.value.password)
    noteSuccess.value = '認証情報を保存しました'
    noteForm.value.password = ''
  } catch {
    noteError.value = '保存に失敗しました'
  } finally {
    savingNote.value = false
  }
}

const handleSaveX = async () => {
  xError.value = ''
  xSuccess.value = ''
  savingX.value = true
  try {
    await saveXCredentials(
      projectId.value,
      xForm.value.apiKey,
      xForm.value.apiSecret,
      xForm.value.accessToken,
      xForm.value.accessTokenSecret,
    )
    xSuccess.value = 'API設定を保存しました'
  } catch {
    xError.value = '保存に失敗しました'
  } finally {
    savingX.value = false
  }
}

const handleTestNote = async () => {
  noteError.value = ''
  noteSuccess.value = ''
  testingNote.value = true
  try {
    const result = await testNoteConnection(projectId.value)
    if (result) {
      noteSuccess.value = '接続成功！Noteへの投稿が可能です。'
    } else {
      noteError.value = '接続に失敗しました。認証情報を確認してください。'
    }
  } finally {
    testingNote.value = false
  }
}

const handleTestX = async () => {
  xError.value = ''
  xSuccess.value = ''
  testingX.value = true
  try {
    const result = await testXConnection(projectId.value)
    if (result) {
      xSuccess.value = '接続成功！Xへの投稿が可能です。'
    } else {
      xError.value = '接続に失敗しました。API設定を確認してください。'
    }
  } finally {
    testingX.value = false
  }
}

const handleDeleteProject = async () => {
  showDeleteConfirm.value = false
  await deleteProject(projectId.value)
  router.push('/projects')
}

onMounted(() => {
  fetchSettings(projectId.value)
})
</script>
