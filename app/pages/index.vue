<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

onMounted(() => {
  navigateTo('/projects')
})
</script>
