<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-gray-900">投稿ログ</h2>
        <p class="text-sm text-gray-600">すべての投稿履歴を確認</p>
      </div>
      <div class="flex gap-2">
        <select v-model="filterPlatform" class="input-field w-auto">
          <option value="">すべて</option>
          <option v-if="currentProject?.noteEnabled" value="note">Note</option>
          <option v-if="currentProject?.xEnabled" value="x">X</option>
        </select>
        <select v-model="filterStatus" class="input-field w-auto">
          <option value="">すべて</option>
          <option value="success">成功</option>
          <option value="failed">失敗</option>
          <option value="posting">投稿中</option>
          <option value="rate_limited">レート制限</option>
        </select>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="card text-center">
        <p class="text-2xl font-bold text-gray-900">{{ totalPosts }}</p>
        <p class="text-xs text-gray-500 mt-1">合計投稿</p>
      </div>
      <div class="card text-center">
        <p class="text-2xl font-bold text-green-600">{{ successPosts }}</p>
        <p class="text-xs text-gray-500 mt-1">成功</p>
      </div>
      <div class="card text-center">
        <p class="text-2xl font-bold text-red-600">{{ failedPosts }}</p>
        <p class="text-xs text-gray-500 mt-1">失敗</p>
      </div>
      <div class="card text-center">
        <p class="text-2xl font-bold text-yellow-600">{{ rateLimitedPosts }}</p>
        <p class="text-xs text-gray-500 mt-1">レート制限</p>
      </div>
    </div>

    <!-- Log list -->
    <div class="card">
      <CommonLoadingSpinner v-if="postLogsLoading" text="読み込み中..." />

      <CommonEmptyState
        v-else-if="filteredLogs.length === 0"
        title="投稿ログがありません"
        description="記事を投稿すると、ここに履歴が表示されます"
        icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />

      <div v-else class="space-y-0 divide-y divide-gray-100">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="py-4 first:pt-0 last:pb-0"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                :class="log.platform === 'note' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ log.platform === 'note' ? 'N' : 'X' }}
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">
                  {{ log.platform === 'note' ? 'Note' : 'X' }}に投稿
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatTimestamp(log.createdAt) }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3 ml-13 sm:ml-0">
              <CommonStatusBadge :status="log.status" type="post" />
              <a
                v-if="log.externalPostUrl"
                :href="log.externalPostUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-indigo-600 hover:text-indigo-800 text-xs"
              >
                投稿を表示
              </a>
            </div>
          </div>

          <div v-if="log.errorMessage" class="mt-2 ml-13 p-2 rounded bg-red-50 text-xs text-red-700">
            {{ log.errorMessage }}
          </div>

          <div v-if="log.retryCount > 0" class="mt-1 ml-13 text-xs text-gray-500">
            リトライ回数: {{ log.retryCount }}
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
const { postLogs, postLogsLoading, fetchPostLogs } = usePostLogs()

const filterPlatform = ref('')
const filterStatus = ref('')

const filteredLogs = computed(() => {
  return postLogs.value.filter((log) => {
    if (filterPlatform.value && log.platform !== filterPlatform.value) return false
    if (filterStatus.value && log.status !== filterStatus.value) return false
    return true
  })
})

const totalPosts = computed(() => postLogs.value.length)
const successPosts = computed(() => postLogs.value.filter((l) => l.status === 'success').length)
const failedPosts = computed(() => postLogs.value.filter((l) => l.status === 'failed').length)
const rateLimitedPosts = computed(() => postLogs.value.filter((l) => l.status === 'rate_limited').length)

const formatTimestamp = (timestamp: Timestamp) => {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleString('ja-JP')
}

onMounted(() => {
  fetchPostLogs(projectId.value)
})
</script>
