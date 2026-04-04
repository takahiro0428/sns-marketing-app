<template>
  <NuxtLink
    :to="path"
    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
    :class="[
      isActive
        ? 'bg-indigo-50 text-indigo-700 font-medium'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      collapsed ? 'justify-center' : '',
    ]"
    :title="collapsed ? label : undefined"
  >
    <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon" />
    </svg>
    <span v-if="!collapsed" class="whitespace-nowrap">{{ label }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  icon: string
  label: string
  path: string
  collapsed: boolean
}>()

const route = useRoute()
const isActive = computed(() => {
  // Exact match for dashboard, prefix match for others
  if (props.path.endsWith('/settings') || props.path.endsWith('/contents') || props.path.endsWith('/plans') || props.path.endsWith('/articles') || props.path.endsWith('/schedule') || props.path.endsWith('/logs')) {
    return route.path.startsWith(props.path)
  }
  return route.path === props.path
})
</script>
