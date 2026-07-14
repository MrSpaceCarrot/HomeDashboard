import { app } from 'electron'
import path from 'node:path'

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'gtfs.db')
}
