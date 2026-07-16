import { Trip } from "../database/models"

export interface TripFull {
  trip: Trip | null
  route: string | null
  destination: string | null
  occupancy: number
  arrival_time: Date
  delay_seconds: number
  due: string
  status: string
  route_background_color: string | null
  route_text_color: string | null
  is_live: boolean
}