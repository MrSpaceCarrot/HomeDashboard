import Database from 'better-sqlite3'
import { getDatabasePath } from './path'

let db: Database.Database

export function getDatabase(): Database {
  if (!db) {
    db = new Database(getDatabasePath())
  }
  return db
}
