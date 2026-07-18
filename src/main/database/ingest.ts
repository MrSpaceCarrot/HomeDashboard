// Imports
import fs from 'fs'
import { promises as fsp } from 'fs'
import AdmZip from 'adm-zip'
import csv from 'fast-csv'
import Database from 'better-sqlite3'
import * as https from 'https'

type DB = InstanceType<typeof Database>

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
          PRAGMA foreign_keys = OFF;
        `)

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
export async function ingestGTFS(db: DB, port, settingsStore): Promise<null> {
  // Create zip file
  const zipFile = fs.createWriteStream('gtfs.zip')

  // Download gtfs zip file
  port.postMessage({ type: "info", message: 'Downloading GTFS' })
  https.get(settingsStore.gtfs_schedule_url, (response) => {
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
            if (["agency", "stops", "routes", "trips", "stop_times", "calendar", "calendar_dates"].includes(tableName) ) {
              port.postMessage({ type: "info", message: `Ingesting file ${tableName}` })
              await ingestFile(db, `./gtfs/${file}`, tableName, port)
            }
          })
        )
        port.postMessage({ type: "complete", message: 'Complete' })
      })
    })
  })
  return null
}
