// Imports
import { getWeatherInfo } from '../utils/weather'

// Main worker logic
process.parentPort?.on('message', async (e) => {
  // Get connection to main
  const port = e.ports[0]
  port.start()

  // When start signal is sent, delete old db and make new one
  if (e.data.message !== 'start') return
  
  // Get weather info
  try {
      const result = await getWeatherInfo(e.data.settingStore)
      port.postMessage({ type: "complete", message: result })
  
    } catch (err) {
      const error = err as Error
      console.log(error)
      port.postMessage({type: 'error', error: error})
    }
})