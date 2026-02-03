// MQTT Connection Configuration
export interface ConnectionConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  protocolVersion?: 3 | 4 | 5; // MQTT protocol version (3=3.1, 4=3.1.1, 5=5.0)
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
  defaultSubscriptions?: Array<{
    topic: string;
    qos: QoS;
  }>;
}

// MQTT Quality of Service levels
export type QoS = 0 | 1 | 2;

// MQTT 5.0 User Properties (key-value pairs)
export type UserProperties = Record<string, string | string[]>;

// MQTT Message
export interface MqttMessage {
  id: string;
  topic: string;
  payload: Buffer | string;
  qos: QoS;
  retained: boolean;
  timestamp: number;
  connectionId?: string;
  userProperties?: UserProperties;
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
  userProperties?: UserProperties;
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
  connectionId?: string; // Filter by connection
  userPropertyKey?: string; // Filter by user property key
  userPropertyValue?: string; // Filter by user property value
}

// Statistics
export interface Statistics {
  totalMessages: number;
  messagesByTopic: Record<string, number>;
  messagesPerSecond: number;
  dataVolume: number;
  topicCount: number;
}