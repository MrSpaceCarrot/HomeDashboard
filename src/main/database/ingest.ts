// Imports
import fs from 'fs'
//import yauzl from 'yauzl'
import AdmZip from 'adm-zip'
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
  const zipFile = fs.createWriteStream('gtfs.zip')

  // Download gtfs zip file
  process.parentPort?.postMessage('Downloading GTFS')
  https.get('https://gtfs.at.govt.nz/gtfs.zip', (response) => {
    response.pipe(zipFile)
    zipFile.on('finish', () => {
      zipFile.close(() => {
        process.parentPort?.postMessage('Download finished')

        // Extract file
        const zip = new AdmZip('gtfs.zip')
        zip.extractAllTo('./gtfs', true)
        fs.readdir('./gtfs', (_error, files) => {
          files.forEach((file) => {
            const tableName = file.replace(/\.txt$/i, '')
            process.parentPort?.postMessage(`Ingesting file ${file} with name ${tableName}`)
            ingestFile(db, `./gtfs/${file}`, tableName)
          })
        })

        return true
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
  fs.unlinkSync(e.data.dbPath)
  const db = new Database(e.data.dbPath)

  // Ingest GTFS
  try {
    ingestGTFS(db)
    process.parentPort?.postMessage('Finished')
  } catch (err) {
    process.parentPort?.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : String(err)
    })
  }
})
