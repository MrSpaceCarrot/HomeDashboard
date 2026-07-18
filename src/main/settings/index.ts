import Store from 'electron-store'
import { Settings } from '@shared/types'

export const settingsStore = new Store<Settings>({
  defaults: {
    stop_code: '133',
    num_trips_to_display: 5,
    time_to_show_mins: 30,
    gtfs_ingest_hour: 21,
    gtfs_skip_ingest: false,
    gtfs_schedule_url: 'https://gtfs.at.govt.nz/gtfs.zip',
    gtfs_realtime_enabled: false,
    gtfs_realtime_url: 'https://api.at.govt.nz/realtime/legacy',
    gtfs_realtime_api_key: '',
    color_overrides: [
      {
        route: 'NX1',
        background_color: '#FFDD00',
        text_color: '#001930'
      },
      {
        route: 'NX2',
        background_color: '#0073BD',
        text_color: '#FFFFFF'
      },
      {
        route: 'WX1',
        background_color: '#00843C',
        text_color: '#001930'
      }
    ]
  },
})