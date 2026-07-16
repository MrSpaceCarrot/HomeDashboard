// Imports
import { Op } from 'sequelize'
import { Calendar, CalendarDate, Stop, StopTime, Trip } from '../database/models'
import { TripFull } from '../types'

// Capitalize first letter of each word
function capitalize(sentence: string): string {
  return sentence.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ');
}

// YYYYMMDD to Date
function GTFSDateToDate(dateString: string): Date {
  const year = dateString.substring(0, 4)
  const month = dateString.substring(4, 6)
  const day = dateString.substring(6, 8)
  return new Date(`${year}-${month}-${day}`); 
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
  return (1000 * seconds) + (1000 * 60 * minutes) + (1000 * 60 * 60 * hours)
}

// Get stop id from stop code
export async function getStopIDFromStopCode(stop_code: string): Promise<string | null> {
  const db_stop = await Stop.findOne({ where: { stop_code: stop_code } })
  if (db_stop) {
    return db_stop?.stop_id
  }
  return null
}

// Get stop name from stop id
export async function getStopNameFromStopID(stop_id: string): Promise<string | null> {
  const db_stop = await Stop.findByPk(stop_id)
  if (db_stop) {
    return db_stop?.stop_name
  }
  return null
}

// Return all stop times for a stop on a given day
export async function getStopTrips(stop_id: string, service_date: Date): Promise<null> {
  // Get all stop times at the stop
  // If a stop has children, get times for them as well
  const db_stop = await Stop.findOne({ where: { stop_id: stop_id } })
  if (!db_stop) { return null }

  const db_stop_ids = db_stop.getEffectiveStopIds()
  const db_stop_times = await StopTime.findAll({ where: { stop_id: {[Op.in]: db_stop_ids} } })

  // Store list of processed stop times
  let trips: TripFull[] = []

  // Exclude stop times which aren't on the specified day
  for (const stop_time of db_stop_times) {
    // Get trip
    const db_trip = await Trip.findOne({ where: { trip_id: stop_time.trip_id }, include: { association: "route" } })
    if (!db_trip) { continue }

    // Get service id
    const service_id = db_trip.service_id

    // Keep track of wether the service is active on this day
    let service_active = true

    // Check if the service runs on this weekday
    const db_calendar = await Calendar.findOne({ where: { service_id: service_id } })
    if (!db_calendar) { continue }

    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    const current_weekday = weekdays[service_date.getDay()]
    if (!db_calendar.get(current_weekday)) { service_active = false }

    // Check if the date is between the start and end date
    if (service_date < GTFSDateToDate(db_calendar.start_date.toString()) || service_date > GTFSDateToDate(db_calendar.end_date.toString())) { service_active = false }
  
    // Check calendar exceptions (if a service is added when it usually isn't)
    const db_exceptions = await CalendarDate.findAll({ where: { service_id: service_id, date: DateToGTFSDate(service_date) } })
    for (const exception of db_exceptions) {
      if (exception.exception_type == 2) {
        service_active = false
      } else {
        service_active = true
      }
    }
    if (!service_active) { continue }

    // Exclude stop time if the trip terminates at this stop
    if (stop_time.pickup_type == 1) { continue }

    // Add stop time to list
    const arrival_delta = GTFSTimeToMs(stop_time.arrival_time)
    const arrival_date = new Date(service_date.getTime() + arrival_delta)
    trips.push({
      trip: db_trip,
      route: db_trip.route?.route_short_name,
      destination: capitalize(stop_time.stop_headsign),
      occupancy: 0,
      arrival_time: arrival_date,
      due: "",
      status: "",
      route_background_color: "",
      route_text_color: "",
      is_live: false
    })
  }
  trips.sort((a, b) => a.arrival_time > b.arrival_time ? 1 : -1)

  // Test
  for (const i of trips) {
    console.log(i)
  }
  
  return null
}