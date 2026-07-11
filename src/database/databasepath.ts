import { app } from "electron";
import path from "node:path";

export function getDatabasePath() {
  return path.join(app.getPath("userData"), "app.db");
}