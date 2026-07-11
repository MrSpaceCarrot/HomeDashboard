// Imports
import fs from 'fs'
import yauzl from 'yauzl'
import csv from 'fast-csv'
import Database from 'better-sqlite3'
import * as https from 'https'

type DB = InstanceType<typeof Database>

// Create table
function createTable(tableName: string, columns: string[]): string {
  const cols = columns.map((c) => `"${c}" TEXT`).join(', ')
  return `CREATE TABLE IF NOT EXISTS "${tableName}" (${cols});`
}

// Ingest single csv file into db
function ingestFile(db: DB, filePath: string, tableName: string): Promise<void> {
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
        resolve()
      })
  })
}

// Ingest all files into db
async function ingestGTFS(db: DB): Promise<boolean> {
  // Create file
  const file = fs.createWriteStream('gtfs.zip')

  // Download gtfs zip file
  https.get('https://gtfs.at.govt.nz/gtfs.zip', (response) => {
    response.pipe(file)
    file.on('finish', () => {
      file.close(() => {
        console.log('Download finished')
        // Ingest data
        /*
        yauzl.open('gtfs.zip', { lazyEntries: true }, (_error, zip) => {
          zip.readEntry()

          zip.on('entry', async (entry) => {
            if (!entry.fileName.endsWith('.csv')) {
              zip.readEntry()
              return
            }

            const tableName = entry.path.replace(/\.csv$/i, '').replace(/[^\w]/g, '_')
            console.log(db, entry.path, tableName)
            ingestFile(db, entry.path, tableName)

            zip.readEntry()
          })
        })
        */
      })
    })
  })
  return true
}

// Main worker logic
process.parentPort?.on('message', async (e) => {
  const [port] = e.ports
  port.start()

  if (e.data.message !== 'start') return

  const db = new Database(e.data.message.dbPath)

  try {
    ingestGTFS(db)
    process.parentPort?.postMessage({ result: 'Finished' })
  } catch (err) {
    process.parentPort?.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : String(err)
    })
  } finally {
    db.close()
  }
})
