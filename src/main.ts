import fs from "fs";
import { app, BrowserWindow, utilityProcess, MessageChannelMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { getDatabasePath } from './database/databasepath';
import ingestPath from './database/worker/ingest?modulePath'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const initializeApp = () => {
  const dbPath = getDatabasePath()
  console.log(dbPath)
  
  const { port1, port2 } = new MessageChannelMain()
  const worker = utilityProcess.fork(ingestPath)
  
  /*
  const worker = utilityProcess.fork(
    path.join(__dirname, "ingest", "ingest.js")
  );
  console.log(fs.existsSync(
    path.join(__dirname, "ingest", "ingest.js")
  ))
  */

  port2.postMessage({action: "start", dbPath}, [port1]);
  /*
  port2.on("spawn", () => {
    console.log("Worker spawned");
  });
  port2.on("exit", (code) => {
    console.log("Worker exited", code);
  });
  port2.on("error", (err) => {
    console.error("Worker error", err);
  });
  */
  port2.on("message", (msg) => {
    console.log("Worker message", msg);
  });

  createWindow()
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true
    },
    frame: true,
    icon: "src/images/icon.png"
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', initializeApp);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.