// Imports
import { Sequelize } from 'sequelize'
import { getDatabasePath } from "./databasepath";

// Access db through sequelize
export const sequelizeConnection = new Sequelize({
  dialect: "sqlite",
  storage: getDatabasePath(),
  logging: false,
});