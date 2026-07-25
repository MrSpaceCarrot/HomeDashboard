<script setup lang="ts">
  // Imports
  import { onMounted, onUnmounted } from 'vue'
  import router from '@renderer/router'

  // Functions
  function keyPress(event) {
    if (event.key === '2') {
      router.push('/')
    }
  }

  // On Mounted
  onMounted(async () => {
    window.addEventListener('keydown', keyPress)
  })

  // Clean up
  onUnmounted(() => {
    window.removeEventListener('keydown', keyPress)
  })

</script>

<template>
  <p>30 degrees</p>
</template>