// Imports
import { initSequelize, registerModels } from "../database/connection"
import { getStopTrips } from "../utils/bus"

// Main worker logic
process.parentPort?.on('message', async (e) => {
  // Get connection to main
  const port = e.ports[0]
  port.start()

  if (e.data.message !== 'start') return
  const sequelize = await initSequelize(e.data.dbPath)
  registerModels(sequelize)

  // Get stop trips
  try {
    const result = await getStopTrips(e.data.settingStore)
    port.postMessage({ type: "complete", message: result })

  } catch (err) {
    const error = err as Error
    console.log(error)
    port.postMessage({type: 'error', error: error})
  }
})
