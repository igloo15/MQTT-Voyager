import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/types/ipc.types';

// Webpack constants provided by electron-forge
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    title: 'MQTT Voyager'
  });

  // Load the index.html of the app
  if (MAIN_WINDOW_WEBPACK_ENTRY) {
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Register IPC handlers
const registerIpcHandlers = () => {
  // Test ping handler
  ipcMain.handle(IPC_CHANNELS.PING, async (_event, message: string) => {
    console.log('Received ping from renderer:', message);
    return `Pong! Received: ${message}`;
  });

  // Additional handlers will be added in future phases
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  // On macOS, re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
