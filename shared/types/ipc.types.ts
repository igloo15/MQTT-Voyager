import type {
  ConnectionConfig,
  MqttMessage,
  PublishOptions,
  QoS,
  Subscription,
  MessageFilter,
} from './models';

// IPC channel names
export const IPC_CHANNELS = {
  // Test channel
  PING: 'ping',

  // MQTT operations
  MQTT_CONNECT: 'mqtt:connect',
  MQTT_DISCONNECT: 'mqtt:disconnect',
  MQTT_SUBSCRIBE: 'mqtt:subscribe',
  MQTT_UNSUBSCRIBE: 'mqtt:unsubscribe',
  MQTT_PUBLISH: 'mqtt:publish',
  MQTT_GET_SUBSCRIPTIONS: 'mqtt:get-subscriptions',

  // MQTT events (main -> renderer)
  MQTT_MESSAGE: 'mqtt:message',
  MQTT_STATUS: 'mqtt:status',
  MQTT_ERROR: 'mqtt:error',

  // Connection profiles
  CONNECTION_SAVE: 'connection:save',
  CONNECTION_LIST: 'connection:list',
  CONNECTION_DELETE: 'connection:delete',
  CONNECTION_GET: 'connection:get',
  CONNECTION_UPDATE: 'connection:update',
  CONNECTION_GET_LAST_USED: 'connection:get-last-used',
  CONNECTION_EXPORT: 'connection:export',
  CONNECTION_IMPORT: 'connection:import',

  // Messages
  MESSAGE_SEARCH: 'message:search',
  MESSAGE_CLEAR: 'message:clear',
  MESSAGE_EXPORT: 'message:export',
  MESSAGE_GET_STATS: 'message:get-stats',
} as const;

// Type-safe IPC request/response types
export interface IpcRequest {
  [IPC_CHANNELS.PING]: {
    request: string;
    response: string;
  };
  [IPC_CHANNELS.MQTT_CONNECT]: {
    request: ConnectionConfig;
    response: void;
  };
  [IPC_CHANNELS.MQTT_DISCONNECT]: {
    request: void;
    response: void;
  };
  [IPC_CHANNELS.MQTT_SUBSCRIBE]: {
    request: { topic: string; qos: QoS };
    response: void;
  };
  [IPC_CHANNELS.MQTT_UNSUBSCRIBE]: {
    request: string;
    response: void;
  };
  [IPC_CHANNELS.MQTT_PUBLISH]: {
    request: { topic: string; payload: string; options: PublishOptions };
    response: void;
  };
  [IPC_CHANNELS.MQTT_GET_SUBSCRIPTIONS]: {
    request: void;
    response: Subscription[];
  };
  [IPC_CHANNELS.MESSAGE_SEARCH]: {
    request: MessageFilter;
    response: MqttMessage[];
  };
  [IPC_CHANNELS.MESSAGE_CLEAR]: {
    request: void;
    response: void;
  };
}

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
