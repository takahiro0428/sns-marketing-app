<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <LayoutSidebar
      :collapsed="sidebarCollapsed"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
    />

    <!-- Main content -->
    <div
      class="flex-1 transition-all duration-300"
      :class="sidebarCollapsed ? 'ml-16' : 'ml-64'"
    >
      <!-- Top bar -->
      <LayoutTopBar @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />

      <!-- Page content -->
      <main class="p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>

    <!-- Mobile sidebar overlay -->
    <div
      v-if="!sidebarCollapsed"
      class="fixed inset-0 bg-black/50 z-30 lg:hidden"
      @click="sidebarCollapsed = true"
    />
  </div>
</template>

<script setup lang="ts">
const sidebarCollapsed = ref(false)

// Auto-collapse on mobile
onMounted(() => {
  if (window.innerWidth < 1024) {
    sidebarCollapsed.value = true
  }
})
</script>
