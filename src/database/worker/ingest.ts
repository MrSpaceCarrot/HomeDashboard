// Imports
import fs from "fs";
import unzipper from "unzipper";
import csv from "fast-csv";
import Database from "better-sqlite3";
import * as https from "https";

type DB = InstanceType<typeof Database>;

// Create table
function createTable(tableName: string, columns: string[]) {
  const cols = columns.map(c => `"${c}" TEXT`).join(", ");
  return `CREATE TABLE IF NOT EXISTS "${tableName}" (${cols});`;
}

// Ingest single csv file into db
function ingestFile(db: DB, filePath: string, tableName: string) {
  return new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);

    let columns: string[] = [];
    let insertStmt: Database.Statement | null = null;

    const insertRow = db.transaction((row: any[]) => {
      insertStmt!.run(...row);
    });

    csv.parseStream(stream, { headers: true })
      .on("error", reject)
      .on("headers", (hdrs) => {
        columns = hdrs;

        db.exec(`
          PRAGMA journal_mode = WAL;
          PRAGMA synchronous = OFF;
          PRAGMA temp_store = MEMORY;
        `);

        db.exec(createTable(tableName, columns));

        const placeholders = columns.map(() => "?").join(",");
        insertStmt = db.prepare(
          `INSERT INTO "${tableName}" VALUES (${placeholders})`
        );
      })
      .on("data", (row) => {
        insertRow(columns.map(c => row[c]));
      })
      .on("end", () => {
        resolve();
      });
  });
}

// Ingest all files into db
async function ingestGTFS(db: DB) {
  // Create file
  const file = fs.createWriteStream("gtfs.zip");
  
  // Download gtfs zip file
  https.get("https://gtfs.at.govt.nz/gtfs.zip", (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log('File downloaded successfully');
      });
    });
  });

  // Ingest data
  const zip = fs.createReadStream("gtfs.zip").pipe(unzipper.Parse());
  for await (const entry of zip) {
    if (entry.type !== "File") {
        entry.autodrain();
        continue;
    }

    if (!entry.path.toLowerCase().endsWith(".csv")) {
        entry.autodrain();
        continue;
    }

    const tableName = entry.path
        .replace(/\.csv$/i, "")
        .replace(/[^\w]/g, "_");

    ingestFile(db, entry, tableName);
  }
 return true;
}

// Main worker logic
process.parentPort?.on("message", async (e) => {
  const [port] = e.ports

  port.on('message', (e) => {
    console.log(`Message from parent: ${e.data}`)
  })
  port.start()
  port.postMessage('hello')
  
  /*
  console.log("Running Worker...")
  if (e.data.message.data.action !== "start") return;

  const db = new Database(e.data.message.data.dbPath);
  
  try {
    ingestGTFS(db);
    process.parentPort?.postMessage({result: "Finished"});
  } catch (err) {
    process.parentPort?.postMessage({type: "error", error: err instanceof Error ? err.message : String(err)});
  } finally {
    db.close();
  }
  */
})

console.log("Importer process started");