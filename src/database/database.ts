// Imports
import Database from "better-sqlite3";
import { getDatabasePath } from "./databasepath";

// Initialize db once and reuse it throughout
let db: Database.Database;

export function getDatabase() {
  if (!db) {
    db = new Database(getDatabasePath());
  }
  return db;
}