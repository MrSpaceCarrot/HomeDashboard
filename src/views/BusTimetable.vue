<script setup lang="ts">
  // Imports
  import { ref, onMounted, onBeforeUnmount, watch, reactive } from 'vue';
  import type { Ref } from 'vue';

  // Variables
  let timer = ref();
  let clockValue = ref("00:00:00")
  let stopName = ref("Stop 133 - Waitemata Train Station");
  let trips = [
    {
      route: "97R",
      destination: "City",
      occupancy: 5,
      arrival_time: new Date(),
      due: new Date(),
      status: "On Time",
      route_background_color: "#0073BD",
      route_text_color: "#000000",
      is_live: false
    }
  ];
  // Functions
  function formatTime(number: number) {
    return number < 10 ? '0' + number : number;
  }

  // On Mounted
  onMounted(async() => {
    timer.value = setInterval(() => {
      let now = new Date();
      let hours = formatTime(now.getHours());
      let minutes = formatTime(now.getMinutes());
      let seconds = formatTime(now.getSeconds());
      clockValue.value = `${hours}:${minutes}:${seconds}`
    }, 1000);
  });

  // Clean up
  onBeforeUnmount(() => {
    timer.value = null;
  });
</script>

<template>
  <div class="flex-col">
    <!-- Header -->
    <div class="bg-[#052849] grid grid-cols-7">
      <div class="col-span-1 p-2">
        <p class="text-white">Route</p>
      </div>

      <div class="col-span-3 p-2">
        <p class="text-white">Destination</p>
      </div>

      <div class="col-span-2 text-center p-2">
        <p class="text-white">Occupany</p>
      </div>

      <div class="col-span-1 text-right p-2">
        <p class="text-white">Due</p>
      </div>
    </div>
    <!-- /Header -->

    <!-- Timetable -->
    <div class="bg-[#001930]">
      <div v-for="trip in trips" class="m-0 p-0">
        <div class="grid grid-cols-7">
          <div class="col-span-1 p-2">
            <span class="text-white p-2 rounded text-3xl" 
                 :style="{ backgroundColor: trip.route_background_color }"
            >{{ trip.route }}
            </span>
          </div>

          <div class="col-span-3 p-2">
            <p class="text-white">{{ trip.destination }}</p>
          </div>

          <div class="col-span-2 text-center p-2">
            <p class="text-white">{{ trip.occupancy }}</p>
          </div>

          <div class="col-span-1 text-right p-2">
            <p class="text-white">{{ trip.due }}</p>
          </div>
        </div>
      </div>
    </div>
    <!-- /Timetable -->

    <!-- Footer -->
     <div class="bg-[#052849] grid grid-cols-2">
      <div class="col-span-1 p-2">
        <p class="text-white">{{ stopName }}</p>
      </div>

      <div class="col-span-1 text-right p-2">
        <p class="text-white">{{ clockValue }}</p>
      </div>
    </div>
    <!-- /Footer -->
  </div>
</template>