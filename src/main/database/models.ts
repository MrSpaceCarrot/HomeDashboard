import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  NonAttribute,
  Sequelize
} from 'sequelize'

// Models
// Agency
export class Agency extends Model<InferAttributes<Agency>, InferCreationAttributes<Agency>> {
  declare agency_id: string
  declare agency_name: string
  declare agency_url: string
  declare agency_timezone: string
  declare agency_lang: string | null
  declare agency_phone: string | null
  declare agency_fare_url: string | null
  declare agency_email: string | null

  static initModel(sequelize: Sequelize) {
    Agency.init(
      {
        agency_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
        agency_name: { type: DataTypes.STRING, allowNull: false },
        agency_url: { type: DataTypes.STRING, allowNull: false },
        agency_timezone: { type: DataTypes.STRING, allowNull: false },
        agency_lang: { type: DataTypes.STRING },
        agency_phone: { type: DataTypes.STRING },
        agency_fare_url: { type: DataTypes.STRING },
        agency_email: { type: DataTypes.STRING }
      },
      {
        sequelize,
        modelName: 'Agency',
        tableName: 'agency',
        timestamps: false
      }
    )
  }
}

// Calendar
export class Calendar extends Model<InferAttributes<Calendar>, InferCreationAttributes<Calendar>> {
  declare service_id: string
  declare monday: number
  declare tuesday: number
  declare wednesday: number
  declare thursday: number
  declare friday: number
  declare saturday: number
  declare sunday: number
  declare start_date: number
  declare end_date: number

  static initModel(sequelize: Sequelize) {
    Calendar.init(
      {
        service_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
        monday: { type: DataTypes.NUMBER },
        tuesday: { type: DataTypes.NUMBER },
        wednesday: { type: DataTypes.NUMBER },
        thursday: { type: DataTypes.NUMBER },
        friday: { type: DataTypes.NUMBER },
        saturday: { type: DataTypes.NUMBER },
        sunday: { type: DataTypes.NUMBER },
        start_date: { type: DataTypes.NUMBER },
        end_date: { type: DataTypes.NUMBER }
      },
      {
        sequelize,
        modelName: 'Calendar',
        tableName: 'calendar',
        timestamps: false
      }
    )
  }
}

// CalendarDate
export class CalendarDate extends Model<InferAttributes<CalendarDate>, InferCreationAttributes<CalendarDate>> {
  declare service_id: ForeignKey<Calendar['service_id']>
  declare date: string
  declare exception_type: number

  static initModel(sequelize: Sequelize) {
    CalendarDate.init(
      {
        service_id: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
          references: { model: 'calendar', key: 'service_id' }
        },
        date: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
        exception_type: { type: DataTypes.NUMBER, allowNull: false }
      },
      {
        sequelize,
        modelName: 'CalendarDate',
        tableName: 'calendar_dates',
        timestamps: false
      }
    )
  }
}

// Stop
export class Stop extends Model<InferAttributes<Stop>, InferCreationAttributes<Stop>> {
  declare stop_id: string
  declare stop_code: string | null
  declare stop_name: string | null
  declare stop_desc: string | null
  declare stop_lat: number | null
  declare stop_lon: number | null
  declare zone_id: string | null
  declare stop_url: string | null
  declare location_type: number | null
  declare parent_station: ForeignKey<Stop['stop_id']> | null
  declare stop_timezone: string | null
  declare platform_code: string | null
  declare wheelchair_boarding: number | null
  declare start_date: string | null
  declare end_date: string | null

  declare parent?: NonAttribute<Stop>
  declare childStops?: NonAttribute<Stop[]>

  // If stop has children, return them all
  getEffectiveStopIds(): string[] {
    if (this.childStops && this.childStops.length > 0) {
      return this.childStops.map((stop) => stop.stop_id)
    }
    return [this.stop_id]
  }

  static initModel(sequelize: Sequelize) {
    Stop.init(
      {
        stop_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
        stop_code: { type: DataTypes.STRING },
        stop_name: { type: DataTypes.STRING },
        stop_desc: { type: DataTypes.STRING },
        stop_lat: { type: DataTypes.FLOAT },
        stop_lon: { type: DataTypes.FLOAT },
        zone_id: { type: DataTypes.STRING },
        stop_url: { type: DataTypes.STRING },
        location_type: { type: DataTypes.NUMBER },
        parent_station: { type: DataTypes.STRING },
        stop_timezone: { type: DataTypes.STRING },
        platform_code: { type: DataTypes.STRING },
        wheelchair_boarding: { type: DataTypes.NUMBER },
        start_date: { type: DataTypes.STRING },
        end_date: { type: DataTypes.STRING }
      },
      {
        sequelize,
        modelName: 'Stop',
        tableName: 'stops',
        timestamps: false
      }
    )
  }
}

// Route
export class Route extends Model<InferAttributes<Route>, InferCreationAttributes<Route>> {
  declare route_id: string
  declare agency_id: ForeignKey<Agency['agency_id']>
  declare route_short_name: string
  declare route_long_name: string
  declare route_desc: string | null
  declare route_type: number | null
  declare route_url: string | null
  declare route_color: string | null
  declare route_text_color: string | null
  declare route_sort_order: number | null
  declare contract_id: string | null

  static initModel(sequelize: Sequelize) {
    Route.init(
      {
        route_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
        agency_id: {
          type: DataTypes.STRING,
          allowNull: false,
          references: { model: 'stops', key: 'stop_id' }
        },
        route_short_name: { type: DataTypes.STRING, allowNull: false },
        route_long_name: { type: DataTypes.STRING, allowNull: false },
        route_desc: { type: DataTypes.STRING },
        route_type: { type: DataTypes.NUMBER },
        route_url: { type: DataTypes.STRING },
        route_color: { type: DataTypes.STRING },
        route_text_color: { type: DataTypes.STRING },
        route_sort_order: { type: DataTypes.NUMBER },
        contract_id: { type: DataTypes.STRING }
      },
      {
        sequelize,
        modelName: 'Route',
        tableName: 'routes',
        timestamps: false
      }
    )
  }
}

// Trip
export class Trip extends Model<InferAttributes<Trip>, InferCreationAttributes<Trip>> {
  declare route_id: ForeignKey<Route['route_id']>
  declare service_id: ForeignKey<Calendar['service_id']>
  declare trip_id: string
  declare trip_headsign: string
  declare trip_short_name: string | null
  declare direction_id: number | null
  declare block_id: string | null
  declare shape_id: string | null
  declare wheelchair_accessible: number | null
  declare bikes_allowed: number | null

  declare route: NonAttribute<Route>

  static initModel(sequelize: Sequelize) {
    Trip.init(
      {
        route_id: {
          type: DataTypes.STRING,
          allowNull: false,
          references: { model: 'routes', key: 'route_id' }
        },
        service_id: {
          type: DataTypes.STRING,
          allowNull: false,
          references: { model: 'calendar', key: 'service_id' }
        },
        trip_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
        trip_headsign: { type: DataTypes.STRING, allowNull: false },
        trip_short_name: { type: DataTypes.STRING },
        direction_id: { type: DataTypes.NUMBER },
        block_id: { type: DataTypes.STRING },
        shape_id: { type: DataTypes.STRING },
        wheelchair_accessible: { type: DataTypes.NUMBER },
        bikes_allowed: { type: DataTypes.NUMBER }
      },
      {
        sequelize,
        modelName: 'Trip',
        tableName: 'trips',
        timestamps: false
      }
    )
  }
}

// StopTime
export class StopTime extends Model<InferAttributes<StopTime>, InferCreationAttributes<StopTime>> {
  declare trip_id: ForeignKey<Trip['trip_id']>
  declare arrival_time: string
  declare departure_time: string
  declare stop_id: ForeignKey<Stop['stop_id']>
  declare stop_sequence: number
  declare stop_headsign: string
  declare pickup_type: number | null
  declare drop_off_type: number | null
  declare shape_dist_traveled: number | null
  declare timepoint: number | null

  static initModel(sequelize: Sequelize) {
    StopTime.init(
      {
        trip_id: {
          type: DataTypes.STRING,
          allowNull: false,
          references: { model: 'trips', key: 'trip_id' },
          primaryKey: true
        },
        arrival_time: { type: DataTypes.STRING, allowNull: false },
        departure_time: { type: DataTypes.STRING, allowNull: false },
        stop_id: {
          type: DataTypes.STRING,
          allowNull: false,
          references: { model: 'stops', key: 'stop_id' }
        },
        stop_sequence: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
        stop_headsign: { type: DataTypes.STRING },
        pickup_type: { type: DataTypes.NUMBER },
        drop_off_type: { type: DataTypes.NUMBER },
        shape_dist_traveled: { type: DataTypes.FLOAT },
        timepoint: { type: DataTypes.NUMBER }
      },
      {
        sequelize,
        modelName: 'StopTime',
        tableName: 'stop_times',
        timestamps: false
      }
    )
  }
}