import { IPC_CHANNELS } from '@shared/types/ipc.types';
import type {
  ConnectionConfig,
  ConnectionStatus,
  MqttMessage,
  MessageFilter,
  PublishOptions,
  QoS,
  Statistics,
  Subscription,
} from '@shared/types/models';
import type { IApiTransport } from './transport';

// Wraps window.electronAPI — used when running inside Electron.
// All calls delegate directly to IPC with the same semantics as before.

export class ElectronTransport implements IApiTransport {
  private invoke(channel: string, ...args: any[]): Promise<any> {
    return (window as any).electronAPI.invoke(channel, ...args);
  }

  private on(channel: string, handler: (...args: any[]) => void): () => void {
    return (window as any).electronAPI.on(channel, handler);
  }

  connections = {
    list: (): Promise<ConnectionConfig[]> =>
      this.invoke(IPC_CHANNELS.CONNECTION_LIST),

    get: (id: string): Promise<ConnectionConfig | null> =>
      this.invoke(IPC_CHANNELS.CONNECTION_GET, id),

    save: (conn: ConnectionConfig): Promise<string> =>
      this.invoke(IPC_CHANNELS.CONNECTION_SAVE, conn),

    update: (id: string, updates: Partial<ConnectionConfig>): Promise<boolean> =>
      this.invoke(IPC_CHANNELS.CONNECTION_UPDATE, { id, updates }),

    delete: (id: string): Promise<boolean> =>
      this.invoke(IPC_CHANNELS.CONNECTION_DELETE, id),

    getLastUsed: (): Promise<ConnectionConfig | null> =>
      this.invoke(IPC_CHANNELS.CONNECTION_GET_LAST_USED),

    getCurrentId: (): Promise<string | null> =>
      this.invoke(IPC_CHANNELS.CONNECTION_GET_CURRENT),

    export: (): Promise<string> =>
      this.invoke(IPC_CHANNELS.CONNECTION_EXPORT),

    import: (json: string): Promise<number> =>
      this.invoke(IPC_CHANNELS.CONNECTION_IMPORT, json),
  };

  mqtt = {
    connect: (config: ConnectionConfig): Promise<void> =>
      this.invoke(IPC_CHANNELS.MQTT_CONNECT, config),

    disconnect: (): Promise<void> =>
      this.invoke(IPC_CHANNELS.MQTT_DISCONNECT),

    subscribe: (topic: string, qos: QoS): Promise<void> =>
      this.invoke(IPC_CHANNELS.MQTT_SUBSCRIBE, { topic, qos }),

    unsubscribe: (topic: string): Promise<void> =>
      this.invoke(IPC_CHANNELS.MQTT_UNSUBSCRIBE, topic),

    publish: (topic: string, payload: string, options: PublishOptions): Promise<void> =>
      this.invoke(IPC_CHANNELS.MQTT_PUBLISH, { topic, payload, options }),

    getSubscriptions: (): Promise<Subscription[]> =>
      this.invoke(IPC_CHANNELS.MQTT_GET_SUBSCRIPTIONS),
  };

  messages = {
    search: (filter: MessageFilter): Promise<MqttMessage[]> =>
      this.invoke(IPC_CHANNELS.MESSAGE_SEARCH, filter),

    clear: (): Promise<void> =>
      this.invoke(IPC_CHANNELS.MESSAGE_CLEAR),

    export: (filter: MessageFilter, format: 'json' | 'csv'): Promise<string> =>
      this.invoke(IPC_CHANNELS.MESSAGE_EXPORT, { filter, format }),

    getStats: (): Promise<Statistics | null> =>
      this.invoke(IPC_CHANNELS.MESSAGE_GET_STATS),

    resetStats: (): Promise<void> =>
      this.invoke(IPC_CHANNELS.MESSAGE_RESET_STATS),
  };

  topics = {
    getTree: (): Promise<any[]> =>
      this.invoke(IPC_CHANNELS.TOPIC_TREE_GET),
  };

  events = {
    onStatus: (handler: (status: ConnectionStatus) => void): (() => void) =>
      this.on(IPC_CHANNELS.MQTT_STATUS, handler),

    onMessage: (handler: (msg: MqttMessage) => void): (() => void) =>
      this.on(IPC_CHANNELS.MQTT_MESSAGE, handler),

    onError: (handler: (error: string) => void): (() => void) =>
      this.on(IPC_CHANNELS.MQTT_ERROR, handler),

    onConnectionChanged: (handler: (connectionId: string | null) => void): (() => void) =>
      this.on(IPC_CHANNELS.CONNECTION_CHANGED, handler),

    onTopicTreeUpdated: (handler: () => void): (() => void) =>
      this.on(IPC_CHANNELS.TOPIC_TREE_UPDATED, handler),

    // Uses fire-and-forget send() — main process relays back to renderer
    sendFilterTopic: (topic: string): void =>
      (window as any).electronAPI.send(IPC_CHANNELS.MESSAGE_FILTER_TOPIC, topic),

    onFilterTopic: (handler: (topic: string) => void): (() => void) =>
      this.on(IPC_CHANNELS.MESSAGE_FILTER_TOPIC, handler),
  };
}
