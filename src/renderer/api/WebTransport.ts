import axios from 'axios';
import { io, Socket } from 'socket.io-client';
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
import { filterTopicBus } from './transport';

// ─── Axios client ─────────────────────────────────────────────────────────────
// Uses relative /api path so it works with any hostname/port
const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const get = (url: string) => client.get(url).then(r => r.data);
const post = (url: string, data?: any) => client.post(url, data).then(r => r.data);
const put = (url: string, data: any) => client.put(url, data).then(r => r.data);
const del = (url: string) => client.delete(url).then(r => r.data);

// ─── Socket.IO singleton ──────────────────────────────────────────────────────
let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
  }
  return _socket;
}

// Wraps Express REST API + Socket.IO — used when running as a web/Docker app.
// The interface is identical to ElectronTransport so components never change.

export class WebTransport implements IApiTransport {
  private onSocket(event: string, handler: (...args: any[]) => void): () => void {
    const socket = getSocket();
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }

  connections = {
    list: (): Promise<ConnectionConfig[]> =>
      get('/connections'),

    get: (id: string): Promise<ConnectionConfig | null> =>
      get(`/connections/${id}`).catch(() => null),

    save: (conn: ConnectionConfig): Promise<string> =>
      post('/connections', conn),

    update: (id: string, updates: Partial<ConnectionConfig>): Promise<boolean> =>
      put(`/connections/${id}`, updates),

    delete: (id: string): Promise<boolean> =>
      del(`/connections/${id}`),

    getLastUsed: (): Promise<ConnectionConfig | null> =>
      get('/connections/last-used').catch(() => null),

    getCurrentId: (): Promise<string | null> =>
      get('/connections/current-id').catch(() => null),

    export: (): Promise<string> =>
      get('/connections/export').then((r: any) => typeof r === 'string' ? r : JSON.stringify(r)),

    import: (json: string): Promise<number> =>
      post('/connections/import', JSON.parse(json)),
  };

  mqtt = {
    connect: (config: ConnectionConfig): Promise<void> =>
      post('/mqtt/connect', config),

    disconnect: (): Promise<void> =>
      post('/mqtt/disconnect'),

    subscribe: (topic: string, qos: QoS): Promise<void> =>
      post('/mqtt/subscribe', { topic, qos }),

    unsubscribe: (topic: string): Promise<void> =>
      post('/mqtt/unsubscribe', { topic }),

    publish: (topic: string, payload: string, options: PublishOptions): Promise<void> =>
      post('/mqtt/publish', { topic, payload, ...options }),

    getSubscriptions: (): Promise<Subscription[]> =>
      get('/mqtt/subscriptions'),
  };

  messages = {
    search: (filter: MessageFilter): Promise<MqttMessage[]> =>
      post('/messages/search', filter),

    clear: (): Promise<void> =>
      post('/messages/clear'),

    export: (filter: MessageFilter, format: 'json' | 'csv'): Promise<string> =>
      post('/messages/export', { filter, format }),

    getStats: (): Promise<Statistics | null> =>
      get('/messages/stats').catch(() => null),

    resetStats: (): Promise<void> =>
      post('/messages/reset-stats'),
  };

  topics = {
    getTree: (): Promise<any[]> =>
      get('/topics/tree').catch(() => []),
  };

  events = {
    onStatus: (handler: (status: ConnectionStatus) => void): (() => void) =>
      this.onSocket('mqtt:status', handler),

    onMessage: (handler: (msg: MqttMessage) => void): (() => void) =>
      this.onSocket('mqtt:message', handler),

    onError: (handler: (error: string) => void): (() => void) =>
      this.onSocket('mqtt:error', handler),

    onConnectionChanged: (handler: (connectionId: string | null) => void): (() => void) =>
      this.onSocket('connection:changed', handler),

    onTopicTreeUpdated: (handler: () => void): (() => void) =>
      this.onSocket('topics:updated', handler),

    // Cross-component relay handled client-side (no server round-trip)
    sendFilterTopic: (topic: string): void => {
      filterTopicBus.dispatchEvent(new CustomEvent('filter', { detail: topic }));
    },

    onFilterTopic: (handler: (topic: string) => void): (() => void) => {
      const listener = (e: Event) => handler((e as CustomEvent).detail);
      filterTopicBus.addEventListener('filter', listener);
      return () => filterTopicBus.removeEventListener('filter', listener);
    },
  };
}
