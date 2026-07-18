<script setup lang="ts">
import { useTripStore } from './stores/tripStore'

const tripStore = useTripStore()

window.tripsUpdate.onTripsUpdate((data) => {
  tripStore.updateTrips(data)
})

</script>

<template>
  <router-view />
</template>
