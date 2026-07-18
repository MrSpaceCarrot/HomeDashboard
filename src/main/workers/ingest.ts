// Imports
import fs from 'fs'
import { promises as fsp } from 'fs'
import Database from 'better-sqlite3'
import { ingestGTFS } from '../database/ingest'
import { initSequelize, registerModels } from '@main/database/connection'

// Main worker logic
process.parentPort?.on('message', async (e) => {
  // Get connection to main
  const port = e.ports[0]
  port.start()

  // When start signal is sent, delete old db and make new one
  if (e.data.message !== 'start') return
  if (fs.existsSync(e.data.dbPath)) {
    await fsp.unlink(e.data.dbPath)
  }

  const sequelize = await initSequelize(e.data.dbPath)
  registerModels(sequelize)

  await sequelize.sync()

  const db = new Database(e.data.dbPath)
  
  // Ingest GTFS
  try {
    await ingestGTFS(db, port, e.data.settingStore)
  } catch (err) {
    port.postMessage({type: 'error', error: err instanceof Error ? err.message : String(err)})
  }
})