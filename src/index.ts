import { app, BrowserWindow, ipcMain, nativeImage, Tray } from 'electron';
import { IPC_CHANNELS } from '../shared/types/ipc.types';
import { MqttService } from './services/mqtt/MqttService';
import { TopicTree } from './services/mqtt/TopicTree';
import { MessageHistory } from './services/storage/MessageHistory';
import { ConnectionStore } from './services/storage/ConnectionStore';
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
const connectionStore = new ConnectionStore();
let messageHistory: MessageHistory | null = null;

const trayIconPath = nativeImage.createFromPath('./images/voyager_icon.png');
const appIconPath = nativeImage.createFromPath('./images/voyager_icon.png');

const createWindow = () => {
  const appTray = new Tray(trayIconPath);
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
    title: 'MQTT Voyager',
    icon: appIconPath,
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
  // Initialize message history database
  messageHistory = new MessageHistory();

  // Set up MQTT service event listeners
  mqttService.on('message', (message) => {
    // Add message to history
    messageHistory?.addMessage(message);

    // Update topic tree
    topicTree.addMessage(message);

    // Send message to renderer
    // Convert Buffer payload to string for IPC transmission
    if (mainWindow && !mainWindow.isDestroyed()) {
      const messageForRenderer = {
        ...message,
        payload: Buffer.isBuffer(message.payload)
          ? message.payload.toString('utf-8')
          : message.payload,
      };
      mainWindow.webContents.send(IPC_CHANNELS.MQTT_MESSAGE, messageForRenderer);
      // Notify renderer that topic tree was updated
      mainWindow.webContents.send(IPC_CHANNELS.TOPIC_TREE_UPDATED);
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

      // Save as last used connection if it has an ID
      if (config.id) {
        connectionStore.setLastUsedConnection(config.id);
      }

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

    if (!messageHistory) {
      return [];
    }
    const messages = messageHistory.searchMessages(filter);
    // Convert Buffer payloads to strings for renderer
    return messages.map(msg => ({
      ...msg,
      payload: Buffer.isBuffer(msg.payload)
        ? msg.payload.toString('utf-8')
        : msg.payload,
    }));
  });

  // Clear messages
  ipcMain.handle(IPC_CHANNELS.MESSAGE_CLEAR, async () => {
    if (messageHistory) {
      messageHistory.clearAll();
      topicTree.clear();
    }
    topicTree.clear();
  });

  // Get statistics
  ipcMain.handle(IPC_CHANNELS.MESSAGE_GET_STATS, async () => {

    if (!messageHistory) {
      return null;
    }
    return messageHistory.getStatistics();
  });

  // Export messages
  ipcMain.handle(
    IPC_CHANNELS.MESSAGE_EXPORT,
    async (_event, { filter, format }: { filter: MessageFilter; format: 'json' | 'csv' }) => {
      if (!messageHistory) {
        throw new Error('Message history not initialized');
      }

      if (format === 'json') {
        return messageHistory.exportAsJSON(filter);
      } else if (format === 'csv') {
        return messageHistory.exportAsCSV(filter);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }
    }
  );

  // ===== Connection Profile Management =====

  // Save connection profile
  ipcMain.handle(IPC_CHANNELS.CONNECTION_SAVE, async (_event, connection: ConnectionConfig) => {
    try {
      connectionStore.saveConnection(connection);
      console.log(`Saved connection profile: ${connection.name}`);
      return connection.id;
    } catch (error) {
      console.error('Failed to save connection:', error);
      throw error;
    }
  });

  // Get all connection profiles
  ipcMain.handle(IPC_CHANNELS.CONNECTION_LIST, async () => {
    try {
      return connectionStore.getAllConnections();
    } catch (error) {
      console.error('Failed to get connections:', error);
      throw error;
    }
  });

  // Get a specific connection profile
  ipcMain.handle(IPC_CHANNELS.CONNECTION_GET, async (_event, id: string) => {
    try {
      return connectionStore.getConnection(id);
    } catch (error) {
      console.error('Failed to get connection:', error);
      throw error;
    }
  });

  // Delete connection profile
  ipcMain.handle(IPC_CHANNELS.CONNECTION_DELETE, async (_event, id: string) => {
    try {
      const success = connectionStore.deleteConnection(id);
      if (success) {
        console.log(`Deleted connection profile: ${id}`);
      }
      return success;
    } catch (error) {
      console.error('Failed to delete connection:', error);
      throw error;
    }
  });

  // Update connection profile
  ipcMain.handle(IPC_CHANNELS.CONNECTION_UPDATE, async (_event, { id, updates }: { id: string; updates: Partial<ConnectionConfig> }) => {
    try {
      const success = connectionStore.updateConnection(id, updates);
      if (success) {
        console.log(`Updated connection profile: ${id}`);
      }
      return success;
    } catch (error) {
      console.error('Failed to update connection:', error);
      throw error;
    }
  });

  // Get last used connection
  ipcMain.handle(IPC_CHANNELS.CONNECTION_GET_LAST_USED, async () => {
    try {
      const lastUsedId = connectionStore.getLastUsedConnection();
      if (lastUsedId) {
        return connectionStore.getConnection(lastUsedId);
      }
      return null;
    } catch (error) {
      console.error('Failed to get last used connection:', error);
      throw error;
    }
  });

  // Export connections
  ipcMain.handle(IPC_CHANNELS.CONNECTION_EXPORT, async () => {
    try {
      return connectionStore.exportConnections();
    } catch (error) {
      console.error('Failed to export connections:', error);
      throw error;
    }
  });

  // Import connections
  ipcMain.handle(IPC_CHANNELS.CONNECTION_IMPORT, async (_event, json: string) => {
    try {
      const count = connectionStore.importConnections(json);
      console.log(`Imported ${count} connection profiles`);
      return count;
    } catch (error) {
      console.error('Failed to import connections:', error);
      throw error;
    }
  });

  // ===== Topic Tree =====

  // Get topic tree
  ipcMain.handle(IPC_CHANNELS.TOPIC_TREE_GET, async () => {
    try {
      return topicTree.toJSON();
    } catch (error) {
      console.error('Failed to get topic tree:', error);
      throw error;
    }
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

  if (messageHistory) {
    messageHistory.close();
  }
});
