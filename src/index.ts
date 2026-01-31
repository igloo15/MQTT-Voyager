import { app, BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/types/ipc.types';
import { MqttService } from './services/mqtt/MqttService';
import { TopicTree } from './services/mqtt/TopicTree';
// TODO: Fix better-sqlite3 native module loading in Electron Forge
// import { MessageHistory } from './services/storage/MessageHistory';
import type {
  ConnectionConfig,
  PublishOptions,
  QoS,
  MessageFilter,
} from '../shared/types/models';

// Webpack constants provided by electron-forge
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

// Service instances
const mqttService = new MqttService();
const topicTree = new TopicTree();
// TODO: Enable when SQLite is fixed
// let messageHistory: MessageHistory | null = null;

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

// Initialize services
const initializeServices = () => {
  // TODO: Initialize message history database when SQLite is fixed
  // messageHistory = new MessageHistory();

  // Set up MQTT service event listeners
  mqttService.on('message', (message) => {
    // TODO: Add message to history when SQLite is fixed
    // messageHistory?.addMessage(message);

    // Update topic tree
    topicTree.addMessage(message);

    // Send message to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.MQTT_MESSAGE, message);
    }
  });

  mqttService.on('status', (status) => {
    // Send status update to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.MQTT_STATUS, status);
    }
  });

  mqttService.on('error', (error) => {
    // Send error to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.MQTT_ERROR, error);
    }
  });

  console.log('Services initialized successfully');
};

// Register IPC handlers
const registerIpcHandlers = () => {
  // Test ping handler
  ipcMain.handle(IPC_CHANNELS.PING, async (_event, message: string) => {
    console.log('Received ping from renderer:', message);
    return `Pong! Received: ${message}`;
  });

  // MQTT Connect
  ipcMain.handle(IPC_CHANNELS.MQTT_CONNECT, async (_event, config: ConnectionConfig) => {
    try {
      await mqttService.connect(config);
      console.log('Connected to MQTT broker');
    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      throw error;
    }
  });

  // MQTT Disconnect
  ipcMain.handle(IPC_CHANNELS.MQTT_DISCONNECT, async () => {
    try {
      await mqttService.disconnect();
      console.log('Disconnected from MQTT broker');
    } catch (error) {
      console.error('Failed to disconnect from MQTT broker:', error);
      throw error;
    }
  });

  // MQTT Subscribe
  ipcMain.handle(
    IPC_CHANNELS.MQTT_SUBSCRIBE,
    async (_event, { topic, qos }: { topic: string; qos: QoS }) => {
      try {
        await mqttService.subscribe(topic, qos);
        topicTree.markSubscribed(topic, true);
        console.log(`Subscribed to topic: ${topic}`);
      } catch (error) {
        console.error(`Failed to subscribe to topic ${topic}:`, error);
        throw error;
      }
    }
  );

  // MQTT Unsubscribe
  ipcMain.handle(IPC_CHANNELS.MQTT_UNSUBSCRIBE, async (_event, topic: string) => {
    try {
      await mqttService.unsubscribe(topic);
      topicTree.markSubscribed(topic, false);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to unsubscribe from topic ${topic}:`, error);
      throw error;
    }
  });

  // MQTT Publish
  ipcMain.handle(
    IPC_CHANNELS.MQTT_PUBLISH,
    async (_event, { topic, payload, options }: { topic: string; payload: string; options: PublishOptions }) => {
      try {
        await mqttService.publish(topic, payload, options);
        console.log(`Published message to topic: ${topic}`);
      } catch (error) {
        console.error(`Failed to publish to topic ${topic}:`, error);
        throw error;
      }
    }
  );

  // Get active subscriptions
  ipcMain.handle(IPC_CHANNELS.MQTT_GET_SUBSCRIPTIONS, async () => {
    return mqttService.getSubscriptions();
  });

  // Message Search
  ipcMain.handle(IPC_CHANNELS.MESSAGE_SEARCH, async (_event, filter: MessageFilter) => {
    // TODO: Enable when SQLite is fixed
    // if (!messageHistory) {
    //   return [];
    // }
    // return messageHistory.searchMessages(filter);
    return [];
  });

  // Clear messages
  ipcMain.handle(IPC_CHANNELS.MESSAGE_CLEAR, async () => {
    // TODO: Enable when SQLite is fixed
    // if (messageHistory) {
    //   messageHistory.clearAll();
    //   topicTree.clear();
    // }
    topicTree.clear();
  });

  // Get statistics
  ipcMain.handle(IPC_CHANNELS.MESSAGE_GET_STATS, async () => {
    // TODO: Enable when SQLite is fixed
    // if (!messageHistory) {
    //   return null;
    // }
    // return messageHistory.getStatistics();
    return null;
  });

  console.log('IPC handlers registered successfully');
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  initializeServices();
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

// Cleanup on quit
app.on('before-quit', async () => {
  console.log('Cleaning up before quit...');

  // Disconnect from MQTT
  if (mqttService.isConnected()) {
    await mqttService.disconnect();
  }

  // TODO: Close database when SQLite is fixed
  // if (messageHistory) {
  //   messageHistory.close();
  // }
});
