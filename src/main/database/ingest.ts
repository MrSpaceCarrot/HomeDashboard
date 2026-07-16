// Imports
import fs from 'fs'
import { promises as fsp } from 'fs'
import AdmZip from 'adm-zip'
import csv from 'fast-csv'
import Database from 'better-sqlite3'
import * as https from 'https'
import { settingsStore } from '../settings'

type DB = InstanceType<typeof Database>

// Create table
function createTable(tableName: string, columns: string[]): string {
  const cols = columns.map((c) => `"${c}" TEXT`).join(', ')
  return `CREATE TABLE IF NOT EXISTS "${tableName}" (${cols});`
}

// Ingest single csv file into db
async function ingestFile(db: DB, filePath: string, tableName: string, port): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath)

    let columns: string[] = []
    let insertStmt: Database.Statement | null = null

    const insertRow = db.transaction((row: string[]) => {
      insertStmt!.run(...row)
    })

    csv
      .parseStream(stream, { headers: true })
      .on('error', reject)
      .on('headers', (hdrs) => {
        columns = hdrs

        db.exec(`
          PRAGMA journal_mode = WAL;
          PRAGMA synchronous = OFF;
          PRAGMA temp_store = MEMORY;
        `)

        db.exec(createTable(tableName, columns))

        const placeholders = columns.map(() => '?').join(',')
        insertStmt = db.prepare(`INSERT INTO "${tableName}" VALUES (${placeholders})`)
      })
      .on('data', (row) => {
        insertRow(columns.map((c) => row[c]))
      })
      .on('end', () => {
        port.postMessage({ type: "info", message: `Finished ingesting file ${tableName}` })
        resolve()
      })
  })
}

// Ingest all files into db
async function ingestGTFS(db: DB, port): Promise<boolean> {
  // Create file
  const zipFile = fs.createWriteStream('gtfs.zip')

  // Download gtfs zip file
  port.postMessage({ type: "info", message: 'Downloading GTFS' })
  https.get(settingsStore.get('gtfs_schedule_url'), (response) => {
    response.pipe(zipFile)
    zipFile.on('finish', () => {
      zipFile.close(async () => {
        port.postMessage({ type: "info", message: 'Download finished' })

        // Extract file
        const zip = new AdmZip('gtfs.zip')
        zip.extractAllTo('./gtfs', true)

        // Ingest each file
        const files = await fsp.readdir('./gtfs')
        await Promise.all(
          files.map(async (file) => {
            const tableName = file.replace(/\.txt$/i, '')
            port.postMessage({ type: "info", message: `Ingesting file ${tableName}` })
            await ingestFile(db, `./gtfs/${file}`, tableName, port)
          })
        )
        port.postMessage({ type: "complete", message: 'Complete' })
      })
    })
  })
  return false
}

// Main worker logic
process.parentPort?.on('message', async (e) => {
  // Get connection to main
  const [port] = e.ports
  port.start()

  // When start signal is sent, delete old db and make new one
  if (e.data.message !== 'start') return
  if (fs.existsSync(e.data.dbPath)) {
    fs.unlinkSync(e.data.dbPath)
  }
  const db = new Database(e.data.dbPath)

  // Ingest GTFS
  try {
    await ingestGTFS(db, port)
  } catch (err) {
    port.postMessage({type: 'error', error: err instanceof Error ? err.message : String(err)})
  }
})
