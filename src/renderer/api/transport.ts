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

// ─── Unified API interface ─────────────────────────────────────────────────────
// All components call these methods — never IPC channels or axios directly.
// ElectronTransport wraps window.electronAPI; WebTransport wraps axios + socket.io.

export interface IApiTransport {
  // Connection profiles
  connections: {
    list(): Promise<ConnectionConfig[]>;
    get(id: string): Promise<ConnectionConfig | null>;
    save(conn: ConnectionConfig): Promise<string>; // returns id
    update(id: string, updates: Partial<ConnectionConfig>): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    getLastUsed(): Promise<ConnectionConfig | null>;
    getCurrentId(): Promise<string | null>;
    export(): Promise<string>; // JSON string
    import(json: string): Promise<number>; // returns count
  };

  // MQTT operations
  mqtt: {
    connect(config: ConnectionConfig): Promise<void>;
    disconnect(): Promise<void>;
    subscribe(topic: string, qos: QoS): Promise<void>;
    unsubscribe(topic: string): Promise<void>;
    publish(topic: string, payload: string, options: PublishOptions): Promise<void>;
    getSubscriptions(): Promise<Subscription[]>;
  };

  // Message history
  messages: {
    search(filter: MessageFilter): Promise<MqttMessage[]>;
    clear(): Promise<void>;
    export(filter: MessageFilter, format: 'json' | 'csv'): Promise<string>;
    getStats(): Promise<Statistics | null>;
    resetStats(): Promise<void>;
  };

  // Topic tree
  topics: {
    getTree(): Promise<any[]>;
  };

  // Real-time events — each returns an unsubscribe function
  events: {
    onStatus(handler: (status: ConnectionStatus) => void): () => void;
    onMessage(handler: (msg: MqttMessage) => void): () => void;
    onError(handler: (error: string) => void): () => void;
    onConnectionChanged(handler: (connectionId: string | null) => void): () => void;
    onTopicTreeUpdated(handler: () => void): () => void;
    // Cross-component topic filter relay (topic tree → message list)
    sendFilterTopic(topic: string): void;
    onFilterTopic(handler: (topic: string) => void): () => void;
  };
}

// ─── Client-side event bus for cross-component signalling ─────────────────────
// Used by WebTransport for MESSAGE_FILTER_TOPIC relay (no server round-trip needed)
export const filterTopicBus = new EventTarget();

// ─── Transport factory ────────────────────────────────────────────────────────
// Auto-detects which implementation to use:
//   Electron build  → window.electronAPI exists  → ElectronTransport
//   Web/Docker build → no window.electronAPI     → WebTransport

let _transport: IApiTransport | null = null;

export function getTransport(): IApiTransport {
  if (_transport) return _transport;

  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ElectronTransport } = require('./ElectronTransport');
    _transport = new ElectronTransport();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WebTransport } = require('./WebTransport');
    _transport = new WebTransport();
  }

  return _transport!;
}

// ─── Convenience re-export ────────────────────────────────────────────────────
// Components import `api` and call api.connections.list(), api.events.onMessage(), etc.
export const api = {
  get connections() { return getTransport().connections; },
  get mqtt() { return getTransport().mqtt; },
  get messages() { return getTransport().messages; },
  get topics() { return getTransport().topics; },
  get events() { return getTransport().events; },
};
