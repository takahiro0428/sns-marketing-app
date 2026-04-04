<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const route = useRoute()
const { selectProject, currentProject } = useProjects()

const projectId = computed(() => route.params.projectId as string)

onMounted(async () => {
  if (projectId.value && !currentProject.value) {
    await selectProject(projectId.value)
  }
})

watch(projectId, async (newId) => {
  if (newId) {
    await selectProject(newId)
  }
})
</script>
