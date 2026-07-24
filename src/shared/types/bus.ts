import { Trip } from "@main/database/models"

export interface TripFull {
  index: number | null | undefined
  trip: Trip | null | undefined
  route: string | null
  destination: string | null
  occupancy: number
  arrival_time: Date
  delay_seconds: number
  due: string
  status: string
  status_background_color: string | null
  status_text_color: string | null
  route_background_color: string | null
  route_text_color: string | null
  is_live: boolean
}