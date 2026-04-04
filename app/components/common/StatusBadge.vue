<template>
  <span :class="badgeClass">{{ label }}</span>
</template>

<script setup lang="ts">
const props = defineProps<{
  status: string
  type?: 'project' | 'plan' | 'chapter' | 'article' | 'post'
}>()

const statusMap: Record<string, { class: string; label: string }> = {
  // Project
  active: { class: 'badge-success', label: 'アクティブ' },
  paused: { class: 'badge-warning', label: '一時停止' },
  completed: { class: 'badge-info', label: '完了' },
  archived: { class: 'badge-neutral', label: 'アーカイブ' },
  // Plan
  draft: { class: 'badge-neutral', label: '下書き' },
  approved: { class: 'badge-success', label: '承認済み' },
  in_progress: { class: 'badge-info', label: '進行中' },
  cancelled: { class: 'badge-error', label: 'キャンセル' },
  // Chapter / Article
  pending: { class: 'badge-neutral', label: '待機中' },
  generating: { class: 'badge-info', label: '生成中' },
  generated: { class: 'badge-success', label: '生成完了' },
  editing: { class: 'badge-warning', label: '編集中' },
  review: { class: 'badge-warning', label: 'レビュー中' },
  posted_note: { class: 'badge-info', label: 'Note投稿済' },
  posted_x: { class: 'badge-info', label: 'X投稿済' },
  posted_all: { class: 'badge-success', label: '全投稿済' },
  failed: { class: 'badge-error', label: '失敗' },
  // Post
  posting: { class: 'badge-info', label: '投稿中' },
  success: { class: 'badge-success', label: '成功' },
  rate_limited: { class: 'badge-warning', label: 'レート制限' },
}

const config = computed(() => statusMap[props.status] || { class: 'badge-neutral', label: props.status })
const badgeClass = computed(() => config.value.class)
const label = computed(() => config.value.label)
</script>
