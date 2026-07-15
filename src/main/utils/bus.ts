// Imports
import { Stop } from '../database/models'

// Get stop id from stop code
export async function get_stop_id_from_stop_code(stop_code: string): Promise<string | null> {
  const db_stop = await Stop.findOne({ where: { stop_code: stop_code } })
  if (db_stop) {
    return db_stop?.stop_id
  }
  return null
}

// Get stop name from stop id
export async function get_stop_name_from_stop_id(stop_id: string): Promise<string | null> {
  const db_stop = await Stop.findOne({ where: { stop_id: stop_id } })
  if (db_stop) {
    return db_stop?.stop_name
  }
  return null
}