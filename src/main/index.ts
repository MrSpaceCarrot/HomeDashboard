import { app, shell, BrowserWindow, ipcMain, utilityProcess, MessageChannelMain } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import ingestPath from './workers/ingest?modulePath'
import tripsPath from './workers/trips?modulePath'
import weatherPath from './workers/weather?modulePath'
import { getDatabasePath } from './database/path'
import { settingsStore } from './settings'
import { getStopNameFromStopCode } from './utils/bus'
import { getSequelize, initSequelize, registerModels } from './database/connection'

let mainWindow: BrowserWindow
let ingestRunning: boolean = false
let tripRefreshController: AbortController | null = null

// Wait for worker to complete before returning
function waitForWorkerComplete(port) {
  return new Promise((resolve) => {
    port.on("message", (e) => {
      if (e.data.type === "complete") {
        resolve(e)
      }
    })
  })
}

// Create promise to wait that can be aborted
function waitForAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve()
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

// Ingest worker task
// Every 60 seconds, check if the daily gtfs ingest time has been reached, then update the db
async function ingestWorkerLoop(dbPath) {
  while (true) {
    const now = new Date()
    if (settingsStore.get('gtfs_skip_ingest') === false && ((now.getHours() === settingsStore.get('gtfs_ingest_hour') && now.getMinutes() === 0) || !fs.existsSync(dbPath))) {
      ingestRunning = true
      
      const { port1, port2 } = new MessageChannelMain()
      const ingest_worker = utilityProcess.fork(ingestPath, [], {stdio: 'pipe'})

      ingest_worker.stdout?.on('data', (data) => { console.log(data.toString()) }) 
      ingest_worker.stderr?.on('data', (data) => { console.error(data.toString()) })

      ingest_worker.postMessage({ message: 'start', dbPath: dbPath, settingStore: settingsStore.store }, [port1])
      port2.start()
      port2.on('message', (e) => {
        console.log(`GTFS Ingest: ${e.data.message}`)
      })

      await waitForWorkerComplete(port2)
      ingestRunning = false
    }

    await new Promise(resolve => setTimeout(resolve, 60_000));
  }
}

// Trips worker task
// Every 20 seconds, update trips only if ingest isn't running
async function tripsWorkerLoop(dbPath) {
  await initSequelize(dbPath)
  const sequelize = getSequelize()
  await registerModels(sequelize)
  
  while (true) {
    if (!ingestRunning) {
      const { port1, port2 } = new MessageChannelMain()
      const trips_worker = utilityProcess.fork(tripsPath, [], {stdio: ['ignore', 'pipe', 'pipe']})

      trips_worker.stdout?.on('data', (data) => { console.log(data.toString()) }) 
      trips_worker.stderr?.on('data', (data) => { console.error(data.toString()) })

      trips_worker.postMessage({ message: 'start', dbPath: dbPath, settingStore: settingsStore.store }, [port1])
      port2.start()
      port2.on('message', async (e) => {
        if (e.data.type === 'complete') {
          // Send trips and other info to renderer
          if (e.data.message[0].route === '') {
            mainWindow.webContents.send('bus:update', ['status', 'No trips due'])
          } else {
            mainWindow.webContents.send('bus:update', ['trips', e.data.message])
            mainWindow.webContents.send('bus:update', ['status', 'Ok'])
          }
          
          const stop_name = await getStopNameFromStopCode(settingsStore.get('stop_code'))
          mainWindow.webContents.send('bus:update', ['stop', `Stop ${settingsStore.get('stop_code')} - ${stop_name}`])

        } else {
          console.log(`Trip Update: ${e.data.message}`)
        }
      })

      waitForWorkerComplete(port2)
    }

    // Wait 20 seconds for next refresh, or earlier if aborted
    const waitController = new AbortController()
    tripRefreshController = waitController
    await waitForAbort(20_000, waitController.signal)
    tripRefreshController = null
  }
}

// Weather worker task
// Every 5 mins, update weather info
async function weatherWorkerLoop() {
      
  const { port1, port2 } = new MessageChannelMain()
  const weather_worker = utilityProcess.fork(weatherPath, [], {stdio: 'pipe'})

  weather_worker.stdout?.on('data', (data) => { console.log(data.toString()) }) 
  weather_worker.stderr?.on('data', (data) => { console.error(data.toString()) })

  weather_worker.postMessage({ message: 'start', settingStore: settingsStore.store }, [port1])
  port2.start()
  port2.on('message', (e) => {
    console.log(`Weather: ${e.data.message}`)
  })
}

async function initializeApp(): Promise<void> {
  createWindow()

  const dbPath = getDatabasePath()
  
  // Setup workers
  ingestWorkerLoop(dbPath)
  tripsWorkerLoop(dbPath)
  weatherWorkerLoop()

  ipcMain.on('uiUpdate', (_event, data) => {
    // Switch stop code if message is sent from ui
    if (data === 'togglestop') {
      const stop_code = settingsStore.get('stop_code')
      const stop_codes = settingsStore.get('stop_codes')
      for (const code of stop_codes) {
        if (code === stop_code) {
          const index = stop_codes.indexOf(code)
          if (stop_codes[index + 1]) {
            console.log("Setting stop code to " + stop_codes[index + 1])
            settingsStore.set('stop_code', stop_codes[index + 1])
          } else {
            console.log("Setting stop code to " + stop_codes[0])
            settingsStore.set('stop_code', stop_codes[0])
          }
          mainWindow.webContents.send('bus:update', ['status', 'Loading...'])
          tripRefreshController?.abort()
        }
      }
    }
  })
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false
    },
    frame: false,
    fullscreen: true,
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  await initializeApp()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) initializeApp()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
