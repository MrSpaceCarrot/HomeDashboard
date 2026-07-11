import { Sequelize } from 'sequelize'
import { getDatabasePath } from './path'

export const sequelizeConnection = new Sequelize({
  dialect: 'sqlite',
  storage: getDatabasePath(),
  logging: false
})
