// Imports
import { Op } from 'sequelize'
import type { TripFull } from '@shared/types'
import GtfsRealtimeBindings from 'gtfs-realtime-bindings'

const { Effect } = GtfsRealtimeBindings.transit_realtime.Alert

// Capitalize first letter of each word
function capitalize(sentence: string): string {
  return sentence
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
    .join(' ')
}

// YYYYMMDD to Date
function GTFSDateToDate(dateString: string): Date {
  const year = dateString.substring(0, 4)
  const month = dateString.substring(4, 6)
  const day = dateString.substring(6, 8)
  return new Date(`${year}-${month}-${day}`)
}

// Date to YYYYMMDD
function DateToGTFSDate(date: Date): string {
  return (
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  )
}

// Parse gtfs time (including above 24:00:00) into milliseconds
function GTFSTimeToMs(gtfs_time: string): number {
  const hours = parseInt(gtfs_time.substring(0, 2))
  const minutes = parseInt(gtfs_time.substring(3, 5))
  const seconds = parseInt(gtfs_time.substring(6, 8))
  return 1000 * seconds + 1000 * 60 * minutes + 1000 * 60 * 60 * hours
}

// Get stop name from stop code
export async function getStopNameFromStopCode(stop_code: string): Promise<string | null> {
  const { Stop } = await import('../database/models')
  const db_stop = await Stop.findOne({ where: { stop_code: stop_code } })
  if (db_stop) {
    return db_stop?.stop_name
  }
  return null
}

// Return next trips for the current stop using all set settings
export async function getStopTrips(settingsStore): Promise<TripFull[] | null> {
  const { Calendar, CalendarDate, Stop, StopTime, Trip, Route } = await import('../database/models')
  
  // If it is before 4 am, use yesterday as the service day to account for services past midnight
  const service_date = new Date()
  if (service_date.getHours() < 4) {
    service_date.setDate(service_date.getDate() - 1)
  }
  service_date.setHours(0, 0, 0, 0)

  // Keep track of trip indexes
  let current_index = 0

  // Get all stop times at the stop
  // If a stop has children, get times for them as well
  const db_stop = await Stop.findOne({ where: { stop_code: settingsStore.stop_code }, include: { association: 'childStops' }  })
  if (!db_stop) {
    return null
  }

  const db_stop_ids = db_stop.getEffectiveStopIds()
  const db_stop_times = await StopTime.findAll({ where: { stop_id: { [Op.in]: db_stop_ids } }})

  // Store list of processed stop times
  const trips: TripFull[] = []

  // Exclude stop times which aren't on the specified day
  for (const stop_time of db_stop_times) {
    // Get trip
    const db_trip = await Trip.findOne({
      where: { trip_id: stop_time.trip_id },
      include: { association: 'route' }
    })
    if (!db_trip) {
      continue
    }

    // Get service id
    const service_id = db_trip.service_id

    // Keep track of wether the service is active on this day
    let service_active = true

    // Get calendar for the service
    const db_calendar = await Calendar.findOne({ where: { service_id: service_id } })
    if (!db_calendar) {
      continue
    }

    // Check if the date is between the start and end date
    if (
      service_date < GTFSDateToDate(db_calendar.start_date.toString()) ||
      service_date > GTFSDateToDate(db_calendar.end_date.toString())
    ) {
      service_active = false
    }

    // Check if the service runs on this weekday
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const current_weekday = weekdays[service_date.getDay()]
    if (db_calendar.get(current_weekday) === 0) {
      service_active = false
    }

    // Check calendar exceptions (if a service is added when it usually isn't)
    const db_exceptions = await CalendarDate.findAll({
      where: { service_id: service_id, date: DateToGTFSDate(service_date) }
    })
    for (const exception of db_exceptions) {
      if (exception.exception_type == 1) {
        service_active = true
      } else if (exception.exception_type == 2) {
        service_active = false
      }
    }
    if (!service_active) {
      continue
    }

    // Exclude stop time if the trip terminates at this stop
    if (stop_time.pickup_type === 1) {
      continue
    }

    // Add stop time to list
    const arrival_delta = GTFSTimeToMs(stop_time.arrival_time)
    const arrival_date = new Date(service_date.getTime() + arrival_delta)
    trips.push({
      index: undefined,
      trip: db_trip,
      route: db_trip.route?.route_short_name,
      destination: capitalize(stop_time.stop_headsign),
      occupancy: -3,
      arrival_time: arrival_date,
      delay_seconds: 0,
      due: '',
      status: '',
      status_background_color: null,
      status_text_color: null,
      route_background_color: '',
      route_text_color: '',
      is_live: false
    })
  }
  trips.sort((a, b) => (a.arrival_time > b.arrival_time ? 1 : -1))

  // Fetch live data if enabled
  const use_live_data = settingsStore.gtfs_realtime_enabled
  let feed!: GtfsRealtimeBindings.transit_realtime.FeedMessage
  if (use_live_data) {
    const response = await fetch(settingsStore.gtfs_realtime_url, {
      headers: {
        'Ocp-Apim-Subscription-Key': settingsStore.gtfs_realtime_api_key,
        Accept: 'application/x-protobuf'
      },
      cache: 'no-store'
    })
    const buffer = await response.arrayBuffer()
    feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer))
  }

  // Filter the collected trips further, and add additional info from live data
  const filtered_trips: TripFull[] = []
  const now = new Date()
  for (const trip of trips) {
    // Keep filtering trips until the screen fills up
    if (filtered_trips.length < settingsStore.num_trips_to_display) {
      // Get info from realtime if enabled
      if (use_live_data) {
        for (const entity of feed.entity) {
          // Set trip delay
          if (entity.tripUpdate && entity.tripUpdate.trip.tripId === trip.trip?.trip_id) {
            trip.is_live = true
            if (entity.tripUpdate.delay) {
              trip.delay_seconds = entity.tripUpdate.delay
            }
            trip.arrival_time = new Date(trip.arrival_time.getTime() + trip.delay_seconds * 1000)
          }

          // Set vehicle occupancy
          if (
            entity.vehicle &&
            entity.vehicle.trip &&
            entity.vehicle.trip.tripId === trip.trip?.trip_id &&
            entity.vehicle.occupancyStatus !== null &&
            entity.vehicle.occupancyStatus !== undefined
          ) {
            trip.occupancy = entity.vehicle.occupancyStatus
            break
          } else {
            trip.occupancy = -3
          }
        }
      }

      // Exclude arrivals before now
      if (trip.arrival_time < now) {
        continue
      }

      // Format due
      const due_delta = trip.arrival_time.getTime() - now.getTime()
      const seconds_due = due_delta / 1000
      if (-30 < seconds_due && seconds_due < 59) {
        trip.due = 'Now'
      } else if (60 < seconds_due && seconds_due < settingsStore.time_to_show_mins * 60) {
        trip.due = Math.round(seconds_due / 60).toString()
      } else {
        trip.due = trip.arrival_time.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      }

      // Format delay
      const trip_delay_mins = Math.round(trip.delay_seconds / 60)
      if (trip_delay_mins < 0) {
        trip.status = `${-trip_delay_mins} min early`
        trip.status_background_color = '#00A7E5'
        trip.status_text_color = '#000000'
      } else if (trip_delay_mins == 0) {
        if (trip.is_live) {
          trip.status = `On Time`
          trip.status_background_color = '#95C11F'
          trip.status_text_color = '#000000'
        } else {
          trip.status = 'Scheduled'
          trip.status_background_color = '#009985'
          trip.status_text_color = '#FFFFFF'
        }
      } else {
        trip.status = `${trip_delay_mins} min late`
        trip.status_background_color = '#DE0A2B'
        trip.status_text_color = '#FFFFFF'
      }

      const db_route = await Route.findOne({ where: { route_id: trip.trip?.route_id } })
      const route_short_name = db_route?.route_short_name ?? ''
      
      // Get route background and text color if present
      // Check if there are color overrides for this route in the config
      let custom_color_used = false
      for (const color_override of settingsStore.color_overrides) {
        if (color_override.route === route_short_name) {
          trip.route_background_color = color_override.background_color
          trip.route_text_color = color_override.text_color
          custom_color_used = true
          break
        }
      }

      if (!custom_color_used) {
        // Check if the route has a color
        if (db_route?.route_text_color) {
          trip.route_text_color = `#${db_route.route_text_color}`
        }
        
        if (db_route?.route_color) {
          trip.route_background_color = `#${db_route.route_color}`
        } 
        
        // If route is frequent with no color set, add one
        else if (/^\d{2}[A-Za-z]?$/.test(route_short_name)) {
          trip.route_background_color = '#00A7E5'
          trip.route_text_color = '#001930'
        }

        // If route is infrequent and no other conditions are met
        else {
          trip.route_text_color = '#FFFFFF'
        }
      }

      // Check if the trip is cancelled
      if (use_live_data) {
        for (const entity of feed.entity) {
          if (entity.alert) {
            const alert = entity.alert as Record<string, unknown>
            const active_periods = (alert.activePeriod ?? alert.active_period) as Array<Record<string, unknown>> | undefined
            const informed_entities = (alert.informedEntity ?? alert.informed_entity) as Array<Record<string, unknown>> | undefined
            const effect = alert.effect
            const is_no_service = effect === Effect.NO_SERVICE || effect === 'NO_SERVICE' || effect === 1

            if (!active_periods?.length || !informed_entities?.length || !is_no_service) {
              continue
            }

            const active_period = active_periods[0]
            let active_period_start: Date | undefined
            if (active_period?.start) {
              active_period_start = new Date(Number(active_period.start) * 1000)
            }

            let active_period_end: Date | undefined
            if (active_period?.end) {
              active_period_end = new Date(Number(active_period.end) * 1000)
            }

            // Check if the arrival time is within the active period
            if (active_period_start && trip.arrival_time >= active_period_start) {
              if (active_period_end && trip.arrival_time > active_period_end) {
                continue
              }

              for (const informed_entity of informed_entities) {
                const route_id = (informed_entity.routeId ?? informed_entity.route_id) as string | undefined
                const stop_id = (informed_entity.stopId ?? informed_entity.stop_id) as string | undefined
                const trip_id = ((informed_entity.trip as Record<string, unknown> | undefined)?.tripId ??
                  (informed_entity.trip as Record<string, unknown> | undefined)?.trip_id) as string | undefined

                // Check if trip is cancelled because the route or stop is affected
                if (
                  (route_id && route_id === db_route?.route_id) ||
                  (stop_id && stop_id === db_stop?.stop_id) ||
                  (trip_id && trip_id === trip.trip?.trip_id)
                ) {
                  trip.status = 'Cancelled'
                  trip.status_background_color = '#CA0076'
                  trip.status_text_color = '#FFFFFF'
                  trip.is_live = false
                  break
                }
              }
            }
          }
        }
      }

      // Truncate destination if it's too long
      if (trip.destination && trip.destination?.length > 15) {
        trip.destination = `${trip.destination.slice(0, 15)}...`
      }

      // Remove trip to avoid errors when passing it out of sequelize and add final trip to list
      delete trip.trip
      filtered_trips.push(trip)
    }
  }
  // Filter again after accounting for delays
  filtered_trips.sort((a, b) => (a.arrival_time > b.arrival_time ? 1 : -1))

  // Add indexes after all sorts (to remove gray bar in ui)
  for (let filtered_trip of filtered_trips) {
    filtered_trip.index = current_index
    current_index += 1
  }

  // If trips list hasn't filled up, add empty dummy entries
  while (filtered_trips.length < settingsStore.num_trips_to_display) {
    filtered_trips.push({
      index: current_index,
      trip: undefined,
      route: '',
      destination: '',
      occupancy: -1,
      arrival_time: new Date,
      delay_seconds: 0,
      due: '',
      status: '',
      status_background_color: null,
      status_text_color: null,
      route_background_color: '',
      route_text_color: '',
      is_live: false
    })
    current_index += 1
  }
  
  return filtered_trips
}
