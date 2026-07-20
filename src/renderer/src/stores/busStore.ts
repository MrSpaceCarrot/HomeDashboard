import { defineStore } from "pinia"
import type { TripFull } from "@shared/types"

export const useBusStore = defineStore('busStore', {
  state: () => (
    { 
      trips: [] as TripFull[],
      stop: '' as string,
      status: 'Loading...' as string
    }
  ),
  actions: {
    updateInfo([key, value]) {
      this[key] = value
    }
  },
})