import { app, shell, BrowserWindow, ipcMain, utilityProcess, MessageChannelMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import ingestPath from './workers/ingest?modulePath'
import tripsPath from './workers/trips?modulePath'
import { getDatabasePath } from './database/path'
import { settingsStore } from './settings'

let mainWindow: BrowserWindow

function waitForWorkerComplete(port) {
  return new Promise((resolve) => {
    port.on("message", (e) => {
      if (e.data.type === "complete") {
        resolve(e)
      }
    })
  })
}

async function initializeApp(): Promise<void> {
  createWindow()

  const dbPath = getDatabasePath()
  
  // Ingest gtfs data into db
  if (settingsStore.get('gtfs_skip_ingest') === false) {
    const { port1, port2 } = new MessageChannelMain()
    const ingest_worker = utilityProcess.fork(ingestPath, [], {stdio: 'pipe'})

    ingest_worker.stdout?.on('data', (data) => { console.log('WORKER STDOUT:', data.toString()) }) 
    ingest_worker.stderr?.on('data', (data) => { console.error('WORKER STDERR:', data.toString()) })

    ingest_worker.postMessage({ message: 'start', dbPath: dbPath, settingStore: settingsStore.store }, [port1])
    port2.start()
    port2.on('message', (e) => {
      console.log(`GTFS Ingest: ${e.data.message}`)
    })

    await waitForWorkerComplete(port2)
  }
  
  
  // Get all trips for the stop
  const { port1, port2 } = new MessageChannelMain()
  const trips_worker = utilityProcess.fork(tripsPath, [], {stdio: 'pipe'})

  trips_worker.stdout?.on('data', (data) => { console.log('WORKER STDOUT:', data.toString()) }) 
  trips_worker.stderr?.on('data', (data) => { console.error('WORKER STDERR:', data.toString()) })

  trips_worker.postMessage({ message: 'start', dbPath: dbPath, settingStore: settingsStore.store }, [port1])
  port2.start()
  port2.on('message', (e) => {
    if (e.data.type === 'complete') {
      mainWindow.webContents.send('trips:update', e.data.message)
    } else {
      console.log(`Trip Update: ${e.data.message}`)
    }

  })

  await waitForWorkerComplete(port2)
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
    transparent: true,
    frame: true
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
