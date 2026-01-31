// IPC channel names
export const IPC_CHANNELS = {
  // Test channel
  PING: 'ping',

  // MQTT operations (to be implemented in Phase 2)
  MQTT_CONNECT: 'mqtt:connect',
  MQTT_DISCONNECT: 'mqtt:disconnect',
  MQTT_SUBSCRIBE: 'mqtt:subscribe',
  MQTT_UNSUBSCRIBE: 'mqtt:unsubscribe',
  MQTT_PUBLISH: 'mqtt:publish',

  // MQTT events (main -> renderer)
  MQTT_MESSAGE: 'mqtt:message',
  MQTT_STATUS: 'mqtt:status',
  MQTT_ERROR: 'mqtt:error',

  // Connection profiles (to be implemented in Phase 3)
  CONNECTION_SAVE: 'connection:save',
  CONNECTION_LIST: 'connection:list',
  CONNECTION_DELETE: 'connection:delete',
  CONNECTION_GET: 'connection:get',

  // Messages (to be implemented later)
  MESSAGE_SEARCH: 'message:search',
  MESSAGE_CLEAR: 'message:clear',
  MESSAGE_EXPORT: 'message:export',
} as const;

// Type-safe IPC API interface
export interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  removeAllListeners: (channel: string) => void;
}

// Extend Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
