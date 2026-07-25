export interface ColorOverride {
  route: string
  background_color: string
  text_color: string
}

export interface Settings {
  stop_code: string
  stop_codes: string[]
  num_trips_to_display: number
  time_to_show_mins: number
  gtfs_ingest_hour: number
  gtfs_skip_ingest: boolean
  gtfs_schedule_url: string
  gtfs_realtime_enabled: boolean
  gtfs_realtime_url: string
  gtfs_realtime_api_key: string
  color_overrides: ColorOverride[]
  weather_api_key: string
  weather_lat: number
  weather_lon: number
}