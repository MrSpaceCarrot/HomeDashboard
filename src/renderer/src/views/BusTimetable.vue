<script setup lang="ts">
// Imports
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useTripStore } from '@renderer/stores/tripStore'

const tripStore = useTripStore()

// Variables
let timer = ref()
let clockValue = ref('00:00:00')
let stopName = ref('STOP NAME HERE')

// Functions
function formatTime(number: number): string {
  return number < 10 ? '0' + number : number.toString()
}

// On Mounted
onMounted(async () => {
  timer.value = setInterval(() => {
    let now = new Date()
    let hours = formatTime(now.getHours())
    let minutes = formatTime(now.getMinutes())
    let seconds = formatTime(now.getSeconds())
    clockValue.value = `${hours}:${minutes}:${seconds}`
  }, 1000)
})

// Clean up
onBeforeUnmount(() => {
  timer.value = null
})
</script>

<template>
  <div class="flex-col relative h-screen">
    <!-- Header -->
    <div class="bg-[#052849] grid grid-cols-7 absolute h-[6cqh] w-full">
      <div class="col-span-1 pl-4 my-auto @container">
        <p class="text-white text-[3cqh]">Route</p>
      </div>

      <div class="col-span-3 pl-4 my-auto @container">
        <p class="text-white text-[3cqh]">Destination</p>
      </div>

      <div class="col-span-2 text-center my-auto @container">
        <p class="text-white text-[3cqh]">Occupany</p>
      </div>

      <div class="col-span-1 pr-2 text-right my-auto @container">
        <p class="text-white text-[3cqh]">Due</p>
      </div>
    </div>
    <!-- /Header -->

    <!-- Timetable -->
    <div class="bg-[#001930] absolute top-[6cqh] bottom-[6cqh] w-full grid grid-rows-5">
      <div v-if="tripStore.trips.length > 0" v-for="trip in tripStore.trips" class="p-0 my-auto h-full">
        <div class="grid grid-cols-7 h-full items-stretch">
          <div class="col-span-1 p-3 text-center">
            <div class="h-full w-full rounded-md flex items-center justify-center @container" v-if="trip.route"
              :style="{ ...(trip.route_background_color ? { backgroundColor: trip.route_background_color } : { border: 'solid 0.7cqmin white' })}"
            >
              <span class="text-[30cqmin] font-bold" 
                :style="{ ...(trip.route_text_color ? { color: trip.route_text_color } : {} )}"
              >{{ trip.route }}</span>
            </div>
          </div>

          <div class="col-span-3 my-auto @container">
            <p class="text-white pl-4 text-[8cqh]">{{ trip.destination }}</p>
          </div>

          <div class="col-span-2 text-center overflow-hidden my-[2cqh]">
            <img :src="`/${trip.occupancy.toString()}.svg`" class="w-full h-full object-contain">
          </div>

          <div class="col-span-1 my-auto pr-4 text-right @container relative">
            <p class="text-white text-[8cqh]">{{ trip.due }}</p>
            <p class="text-[1.5cqh] absolute bottom-[-5cqmin] right-0 mr-4 p-[0.4cqh] rounded-md"
              :style="{ 
                ...(trip.status_background_color ? { backgroundColor: trip.status_background_color } : {}),
                ...(trip.status_text_color ? { color: trip.status_text_color } : {})
              }"
            >{{ trip.status }}</p>
          </div>
        </div>
      </div>

      <div v-else>
        <p class="text-white text-4xl p-2">Loading</p>
      </div>
    </div>
    <!-- /Timetable -->

    <!-- Footer -->
    <div class="bg-[#052849] grid grid-cols-2 absolute bottom-0 h-[6cqh] w-full">
      <div class="col-span-1 my-auto pl-2 @container">
        <p class="text-white text-[3cqh]">{{ stopName }}</p>
      </div>

      <div class="col-span-1 text-right my-auto pr-2 @container">
        <p class="text-white text-[3cqh]">{{ clockValue }}</p>
      </div>
    </div>
    <!-- /Footer -->
  </div>
</template>
