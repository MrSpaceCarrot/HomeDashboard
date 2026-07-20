<script setup lang="ts">
import { useBusStore } from './stores/busStore'

const busStore = useBusStore()

window.busUpdate.onBusUpdate((data) => {
  busStore.updateInfo(data)
})

</script>

<template>
  <router-view />
</template>
