<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div class="fixed inset-0 bg-black/50" @click="$emit('update:modelValue', false)" />
      <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
        <p class="mt-2 text-sm text-gray-600">{{ message }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button class="btn-secondary" @click="$emit('update:modelValue', false)">
            キャンセル
          </button>
          <button
            :class="danger ? 'btn-danger' : 'btn-primary'"
            @click="$emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  danger?: boolean
}>(), {
  confirmText: '確認',
  danger: false,
})

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
</script>
