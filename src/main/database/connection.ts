import { Sequelize } from 'sequelize'
import { Agency, Calendar, CalendarDate, Stop, Route, Trip, StopTime } from './models'

export let sequelizeConnection: Sequelize | undefined

export function initSequelize(dbPath: string) {
  if (!sequelizeConnection) {
    sequelizeConnection = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false
    })
  }
  return sequelizeConnection
}

export function getSequelize() {
  if (!sequelizeConnection) {
    throw new Error('Sequelize has not been initialized')
  }
  return sequelizeConnection
}

export function registerModels(sequelize: Sequelize) {
  Agency.initModel(sequelize)
  Calendar.initModel(sequelize)
  CalendarDate.initModel(sequelize)
  Stop.initModel(sequelize)
  Route.initModel(sequelize)
  Trip.initModel(sequelize)
  StopTime.initModel(sequelize)

  CalendarDate.belongsTo(Calendar, { as: 'calendar', foreignKey: 'service_id' })
  Calendar.hasMany(CalendarDate, { as: 'calendarDates', foreignKey: 'service_id' })

  Stop.belongsTo(Stop, { as: 'parent', foreignKey: 'parent_station', targetKey: 'stop_id' })
  Stop.hasMany(Stop, { as: 'childStops', foreignKey: 'parent_station', sourceKey: 'stop_id' })

  Route.belongsTo(Agency, { as: 'agency', foreignKey: 'agency_id' })
  Agency.hasMany(Route, { as: 'routes', foreignKey: 'agency_id' })

  Trip.belongsTo(Route, { as: 'route', foreignKey: 'route_id' })
  Route.hasMany(Trip, { as: 'trips', foreignKey: 'route_id' })
  
  Trip.belongsTo(Calendar, { as: 'calendar', foreignKey: 'service_id' })
  Calendar.hasMany(Trip, { as: 'trips', foreignKey: 'service_id' })

  StopTime.belongsTo(Trip, { as: 'trip', foreignKey: 'trip_id' })
    Trip.hasMany(StopTime, { as: 'stopTimes', foreignKey: 'trip_id' })

    StopTime.belongsTo(Stop, { as: 'stop', foreignKey: 'stop_id' })
    Stop.hasMany(StopTime, { as: 'stopTimes', foreignKey: 'stop_id' })


  return {
    Agency, Calendar, CalendarDate, Stop, Route, Trip, StopTime
  }
}