"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelizeConnection = void 0;
exports.getDatabase = getDatabase;
// Imports
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const sequelize_1 = require("sequelize");
// Access db through sequelize
exports.sequelizeConnection = new sequelize_1.Sequelize({
    dialect: 'sqlite',
    storage: 'app.db'
});
// Initialize db once and reuse it throughout
let db;
function getDatabase() {
    if (!db) {
        db = new better_sqlite3_1.default(path_1.default.join(electron_1.app.getPath("userData"), "data.sqlite"));
    }
    return db;
}
//# sourceMappingURL=database.js.map