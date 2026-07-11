"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Imports
const fs_1 = __importDefault(require("fs"));
const unzipper_1 = __importDefault(require("unzipper"));
const fast_csv_1 = __importDefault(require("fast-csv"));
const https = __importStar(require("https"));
const node_worker_threads_1 = require("node:worker_threads");
const database_1 = require("./database");
// Create table
function createTable(tableName, columns) {
    const cols = columns.map(c => `"${c}" TEXT`).join(", ");
    return `CREATE TABLE IF NOT EXISTS "${tableName}" (${cols});`;
}
// Ingest single csv file into db
function ingestFile(db, filePath, tableName) {
    return new Promise((resolve, reject) => {
        const stream = fs_1.default.createReadStream(filePath);
        let columns = [];
        let insertStmt = null;
        const insertRow = db.transaction((row) => {
            insertStmt.run(...row);
        });
        fast_csv_1.default.parseStream(stream, { headers: true })
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
            insertStmt = db.prepare(`INSERT INTO "${tableName}" VALUES (${placeholders})`);
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
async function ingestGTFS() {
    // Create file
    const file = fs_1.default.createWriteStream("gtfs.zip");
    // Download gtfs zip file
    https.get("https://gtfs.at.govt.nz/gtfs.zip", (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close(() => {
                //console.log('File downloaded successfully');
            });
        });
    });
    // Ingest data
    let db = (0, database_1.getDatabase)();
    const zip = fs_1.default.createReadStream("gtfs.zip").pipe(unzipper_1.default.Parse());
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
// Worker run and return result
const result = ingestGTFS();
if (node_worker_threads_1.parentPort) {
    node_worker_threads_1.parentPort.postMessage(result);
}
//# sourceMappingURL=ingest.js.map