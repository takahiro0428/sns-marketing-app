<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50" @click="close" />
      <div class="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-6">新規プロジェクト作成</h2>

        <form @submit.prevent="handleCreate" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">プロジェクト名 *</label>
            <input v-model="form.name" type="text" required class="input-field" placeholder="例: テック系ブログ連載" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea v-model="form.description" rows="3" class="input-field" placeholder="プロジェクトの概要..." />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input v-model="form.noteEnabled" type="checkbox" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-600" />
              <div>
                <p class="text-sm font-medium text-gray-900">Note</p>
                <p class="text-xs text-gray-500">note.comに投稿</p>
              </div>
            </label>
            <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input v-model="form.xEnabled" type="checkbox" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-600" />
              <div>
                <p class="text-sm font-medium text-gray-900">X (Twitter)</p>
                <p class="text-xs text-gray-500">Xに投稿</p>
              </div>
            </label>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">投稿間隔（分）</label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-500">最小</label>
                <input v-model.number="form.postingIntervalMinMinutes" type="number" min="30" class="input-field" />
              </div>
              <div>
                <label class="text-xs text-gray-500">最大</label>
                <input v-model.number="form.postingIntervalMaxMinutes" type="number" min="60" class="input-field" />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">アクティブ時間帯</label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-500">開始（時）</label>
                <input v-model.number="form.activeHoursStart" type="number" min="0" max="23" class="input-field" />
              </div>
              <div>
                <label class="text-xs text-gray-500">終了（時）</label>
                <input v-model.number="form.activeHoursEnd" type="number" min="1" max="24" class="input-field" />
              </div>
            </div>
          </div>

          <div v-if="error" class="p-3 rounded-lg bg-red-50 text-sm text-red-700">{{ error }}</div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" class="btn-secondary" @click="close">キャンセル</button>
            <button type="submit" class="btn-primary" :disabled="creating">
              <CommonLoadingSpinner v-if="creating" size="sm" />
              <span v-else>作成</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ProjectFormData } from '~/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [projectId: string]
}>()

const { createProject } = useProjects()

const creating = ref(false)
const error = ref('')

const defaultForm = (): ProjectFormData => ({
  name: '',
  description: '',
  noteEnabled: true,
  xEnabled: true,
  postingIntervalMinMinutes: 120,
  postingIntervalMaxMinutes: 480,
  timezone: 'Asia/Tokyo',
  activeHoursStart: 8,
  activeHoursEnd: 22,
})

const form = ref<ProjectFormData>(defaultForm())

const close = () => {
  emit('update:modelValue', false)
  form.value = defaultForm()
  error.value = ''
}

const handleCreate = async () => {
  error.value = ''
  creating.value = true
  try {
    const project = await createProject(form.value)
    emit('created', project.id)
    close()
  } catch {
    error.value = 'プロジェクトの作成に失敗しました'
  } finally {
    creating.value = false
  }
}
</script>
