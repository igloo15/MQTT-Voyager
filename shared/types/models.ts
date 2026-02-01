// MQTT Connection Configuration
export interface ConnectionConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  clientId?: string;
  username?: string;
  password?: string;
  passwordEncrypted?: boolean;
  cleanSession?: boolean;
  keepalive?: number;
  reconnectPeriod?: number;
  connectTimeout?: number;
  will?: {
    topic: string;
    payload: string;
    qos: QoS;
    retain: boolean;
  };
  tls?: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

// MQTT Quality of Service levels
export type QoS = 0 | 1 | 2;

// MQTT Message
export interface MqttMessage {
  id: string;
  topic: string;
  payload: Buffer | string;
  qos: QoS;
  retained: boolean;
  timestamp: number;
  connectionId?: string;
}

// Connection Status
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  error?: string;
  connectedAt?: number;
}

// Topic Tree Node
export interface TopicNode {
  name: string;
  fullPath: string;
  children: Map<string, TopicNode>;
  messageCount: number;
  lastMessage?: MqttMessage;
  subscribed: boolean;
}

// Publish Options
export interface PublishOptions {
  qos: QoS;
  retain: boolean;
}

// Subscription
export interface Subscription {
  topic: string;
  qos: QoS;
}

// Message Search/Filter Criteria
export interface MessageFilter {
  topic?: string;
  payloadSearch?: string;
  startTime?: number;
  endTime?: number;
  qos?: QoS;
  retained?: boolean;
  limit?: number;
  offset?: number;
}

// Statistics
export interface Statistics {
  totalMessages: number;
  messagesByTopic: Record<string, number>;
  messagesPerSecond: number;
  dataVolume: number;
  topicCount: number;
}