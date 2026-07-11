"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = database_1.sequelizeConnection;
// Models
// Agency
const Agency = sequelize.define('Agency', {
    agency_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    agency_name: { type: DataTypes.STRING, allowNull: false },
    agency_url: { type: DataTypes.STRING, allowNull: false },
    agency_timezone: { type: DataTypes.STRING, allowNull: false },
    agency_lang: { type: DataTypes.STRING },
    agency_phone: { type: DataTypes.STRING },
    agency_fare_url: { type: DataTypes.STRING },
    agency_email: { type: DataTypes.STRING },
}, { tableName: 'agency' });
// Calendar
const Calendar = sequelize.define('Calendar', {
    service_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    monday: { type: DataTypes.NUMBER },
    tuesday: { type: DataTypes.NUMBER },
    wednesday: { type: DataTypes.NUMBER },
    thursday: { type: DataTypes.NUMBER },
    friday: { type: DataTypes.NUMBER },
    saturday: { type: DataTypes.NUMBER },
    sunday: { type: DataTypes.NUMBER },
    start_date: { type: DataTypes.NUMBER },
    end_date: { type: DataTypes.NUMBER },
}, { tableName: 'calendar' });
// CalendarDate
const CalendarDate = sequelize.define('CalendarDate', {
    service_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true, references: { model: "calendar", key: "service_id" } },
    date: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    exception_type: { type: DataTypes.NUMBER, allowNull: false },
}, { tableName: 'calendar_dates' });
CalendarDate.belongsTo(Calendar, { as: "calendar", foreignKey: "calendar_service_id" });
Calendar.hasMany(CalendarDate, { as: "calendarDates", foreignKey: "calendar_service_id" });
// Stop
const Stop = sequelize.define('Stop', {
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
    end_date: { type: DataTypes.STRING },
    parent_stop_id: { type: DataTypes.STRING, allowNull: true, references: { model: "stops", key: "stop_id" } }
}, { tableName: 'stops' });
Stop.belongsTo(Stop, { as: "parent", foreignKey: "parent_stop_id", targetKey: "stop_id" });
Stop.hasMany(Stop, { as: "childStops", foreignKey: "parent_stop_id", sourceKey: "stop_id" });
// Route
const Route = sequelize.define('Route', {
    route_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    agency_id: { type: DataTypes.STRING, allowNull: false, references: { model: "stops", key: "stop_id" } },
    route_short_name: { type: DataTypes.STRING, allowNull: false },
    route_long_name: { type: DataTypes.STRING, allowNull: false },
    route_desc: { type: DataTypes.STRING },
    route_type: { type: DataTypes.NUMBER },
    route_url: { type: DataTypes.STRING },
    route_color: { type: DataTypes.STRING },
    route_text_color: { type: DataTypes.STRING },
    route_sort_order: { type: DataTypes.NUMBER },
    contract_id: { type: DataTypes.STRING },
}, { tableName: 'routes' });
Route.belongsTo(Agency, { as: "agency", foreignKey: "agency_agency_id" });
Agency.hasMany(Route, { as: "routes", foreignKey: "agency_agency_id" });
// Trip
const Trip = sequelize.define('Trip', {
    route_id: { type: DataTypes.STRING, allowNull: false, references: { model: "routes", key: "route_id" } },
    service_id: { type: DataTypes.STRING, allowNull: false, references: { model: "calendar", key: "service_id" } },
    trip_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    trip_headsign: { type: DataTypes.STRING, allowNull: false },
    trip_short_name: { type: DataTypes.STRING },
    direction_id: { type: DataTypes.NUMBER },
    block_id: { type: DataTypes.STRING },
    shape_id: { type: DataTypes.STRING },
    wheelchair_accessible: { type: DataTypes.NUMBER },
    bikes_allowed: { type: DataTypes.NUMBER },
}, { tableName: 'trips' });
Trip.belongsTo(Route, { as: "route", foreignKey: "route_route_id" });
Route.hasMany(Trip, { as: "trips", foreignKey: "route_route_id" });
Trip.belongsTo(Calendar, { as: "calendar", foreignKey: "calendar_service_id" });
Calendar.hasMany(Trip, { as: "trips", foreignKey: "calendar_service_id" });
// StopTime
const StopTime = sequelize.define('StopTime', {
    trip_id: { type: DataTypes.STRING, allowNull: false, references: { model: "trips", key: "trip_id" } },
    arrival_time: { type: DataTypes.STRING, allowNull: false },
    departure_time: { type: DataTypes.STRING, allowNull: false },
    stop_id: { type: DataTypes.STRING, allowNull: false, references: { model: "stops", key: "stop_id" } },
    stop_sequence: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    stop_headsign: { type: DataTypes.STRING },
    pickup_type: { type: DataTypes.NUMBER },
    drop_off_type: { type: DataTypes.NUMBER },
    shape_dist_traveled: { type: DataTypes.FLOAT },
    timepoint: { type: DataTypes.NUMBER },
}, { tableName: 'stop_times' });
StopTime.belongsTo(Trip, { as: "trip", foreignKey: "trip_trip_id" });
Trip.hasMany(StopTime, { as: "stopTimes", foreignKey: "trip_trip_id" });
StopTime.belongsTo(Stop, { as: "stop", foreignKey: "stop_stop_id" });
Stop.hasMany(StopTime, { as: "stopTimes", foreignKey: "stop_stop_id" });
//# sourceMappingURL=models.js.map