<template>
  <nav class="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
    <NuxtLink
      v-if="prevStep"
      :to="prevStep.path"
      class="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span class="hidden sm:inline">{{ prevStep.label }}</span>
      <span class="sm:hidden">前へ</span>
    </NuxtLink>
    <div v-else class="w-16" />

    <!-- Current step indicator -->
    <div class="flex items-center gap-2">
      <template v-for="(step, i) in steps" :key="i">
        <NuxtLink
          :to="step.path"
          class="w-2.5 h-2.5 rounded-full transition-all"
          :class="[
            i + 1 === currentStep ? 'bg-indigo-500 scale-125' : '',
            i + 1 < currentStep ? 'bg-green-400' : '',
            i + 1 > currentStep ? 'bg-gray-300' : '',
          ]"
          :title="step.label"
        />
      </template>
    </div>

    <NuxtLink
      v-if="nextStep"
      :to="nextStep.path"
      class="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
    >
      <span class="hidden sm:inline">{{ nextStep.label }}</span>
      <span class="sm:hidden">次へ</span>
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </NuxtLink>
    <div v-else class="w-16" />
  </nav>
</template>

<script setup lang="ts">
const props = defineProps<{
  currentStep: 1 | 2 | 3 | 4
}>()

const route = useRoute()
const projectId = computed(() => route.params.projectId as string)

const steps = computed(() => {
  const pid = projectId.value
  return [
    { label: 'コンテンツ', path: `/projects/${pid}/contents` },
    { label: '配信計画', path: `/projects/${pid}/plans` },
    { label: '記事', path: `/projects/${pid}/articles` },
    { label: 'スケジュール', path: `/projects/${pid}/schedule` },
  ]
})

const prevStep = computed(() =>
  props.currentStep > 1 ? steps.value[props.currentStep - 2] : null,
)

const nextStep = computed(() =>
  props.currentStep < steps.value.length ? steps.value[props.currentStep] : null,
)
</script>
