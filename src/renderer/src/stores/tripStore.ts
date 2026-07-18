import { defineStore } from "pinia"
import type { TripFull } from "@shared/types"

export const useTripStore = defineStore('tripStore', {
  state: () => (
    { 
      trips: [] as TripFull[], 
    }
  ),
  actions: {
    updateTrips(trips) {
      this.trips = trips
    },
  },
})