import * as mqtt from 'mqtt';
import { EventEmitter } from 'events';
import type {
  ConnectionConfig,
  ConnectionStatus,
  MqttMessage,
  PublishOptions,
  QoS,
  Subscription,
} from '../../../shared/types/models';

export class MqttService extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private config: ConnectionConfig | null = null;
  private status: ConnectionStatus = 'disconnected';
  private subscriptions: Map<string, QoS> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isManualDisconnect = false;

  constructor() {
    super();
  }

  /**
   * Connect to MQTT broker
   */
  async connect(config: ConnectionConfig): Promise<void> {
    // Clean up any existing connection first
    if (this.client) {
      await this.disconnect();
    }

    this.config = config;
    this.status = 'connecting';
    this.isManualDisconnect = false;
    this.reconnectAttempts = 0;
    this.emit('status', this.status);

    return new Promise((resolve, reject) => {
      try {
        const protocol = config.protocol || 'mqtt';
        const brokerUrl = `${protocol}://${config.host}:${config.port}`;

        const options: mqtt.IClientOptions = {
          clientId: config.clientId || `mqtt_voyager_${Math.random().toString(16).slice(2, 8)}`,
          username: config.username,
          password: config.password,
          clean: config.cleanSession !== false,
          keepalive: config.keepalive || 60,
          reconnectPeriod: config.reconnectPeriod || 1000,
          connectTimeout: config.connectTimeout || 30000,
        };

        // Will message
        if (config.will) {
          options.will = {
            topic: config.will.topic,
            payload: config.will.payload,
            qos: config.will.qos,
            retain: config.will.retain,
          };
        }

        // TLS options
        if (protocol === 'mqtts' || protocol === 'wss') {
          options.rejectUnauthorized = config.tls?.rejectUnauthorized !== false;
          if (config.tls?.ca) {
            options.ca = config.tls.ca;
          }
          if (config.tls?.cert) {
            options.cert = config.tls.cert;
          }
          if (config.tls?.key) {
            options.key = config.tls.key;
          }
        }

        console.log(`Connecting to MQTT broker: ${brokerUrl}`);
        console.log(`MQTT options:`, {
          clientId: options.clientId,
          clean: options.clean,
          keepalive: options.keepalive,
          reconnectPeriod: options.reconnectPeriod,
        });
        this.client = mqtt.connect(brokerUrl, options);

        // Set up event handlers - these will be cleaned up in disconnect()
        const onConnect = () => {
          console.log('MQTT connected successfully');
          this.status = 'connected';
          this.reconnectAttempts = 0;
          this.emit('status', this.status);
          resolve();

          // Resubscribe to previous topics
          this.resubscribeAll();
        };

        const onError = (error: Error) => {
          console.error('MQTT connection error:', error);

          // Only reject on initial connection error
          const isInitialConnection = this.reconnectAttempts === 0 && this.status === 'connecting';

          this.status = 'error';
          this.emit('status', this.status);
          this.emit('error', error.message);

          if (isInitialConnection) {
            reject(error);
          }
        };

        const onReconnect = () => {
          // Don't reconnect if it was a manual disconnect
          if (this.isManualDisconnect) {
            this.client?.end(true);
            return;
          }

          console.log('MQTT reconnecting...');
          this.reconnectAttempts++;

          if (this.reconnectAttempts > this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            this.client?.end(true);
            this.status = 'disconnected';
            this.emit('status', this.status);
            return;
          }

          this.status = 'reconnecting';
          this.emit('status', this.status);
        };

        const onClose = () => {
          console.log('MQTT connection closed');
          if (this.status !== 'disconnected' && !this.isManualDisconnect) {
            this.status = 'disconnected';
            this.emit('status', this.status);
          }
        };

        const onMessage = (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
          const message: MqttMessage = {
            id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            topic,
            payload,
            qos: packet.qos,
            retained: packet.retain,
            timestamp: Date.now(),
            connectionId: this.config?.id,
          };

          this.emit('message', message);
        };

        const onOffline = () => {
          console.log('MQTT client offline');
          if (!this.isManualDisconnect) {
            this.status = 'disconnected';
            this.emit('status', this.status);
          }
        };

        // Attach event handlers
        this.client.on('connect', onConnect);
        this.client.on('error', onError);
        this.client.on('reconnect', onReconnect);
        this.client.on('close', onClose);
        this.client.on('message', onMessage);
        this.client.on('offline', onOffline);

        // Store handlers for cleanup
        (this.client as any)._customHandlers = {
          onConnect,
          onError,
          onReconnect,
          onClose,
          onMessage,
          onOffline,
        };

      } catch (error) {
        this.status = 'error';
        this.emit('status', this.status);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) {
        this.status = 'disconnected';
        this.emit('status', this.status);
        resolve();
        return;
      }

      this.isManualDisconnect = true;

      // Remove all event listeners before disconnecting
      const handlers = (this.client as any)._customHandlers;
      if (handlers) {
        this.client.removeListener('connect', handlers.onConnect);
        this.client.removeListener('error', handlers.onError);
        this.client.removeListener('reconnect', handlers.onReconnect);
        this.client.removeListener('close', handlers.onClose);
        this.client.removeListener('message', handlers.onMessage);
        this.client.removeListener('offline', handlers.onOffline);
      } else {
        // Fallback: remove all listeners
        this.client.removeAllListeners();
      }

      this.client.end(false, {}, () => {
        console.log('MQTT disconnected');
        this.client = null;
        this.status = 'disconnected';
        this.subscriptions.clear();
        this.emit('status', this.status);
        this.isManualDisconnect = false;
        resolve();
      });
    });
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(topic: string, qos: QoS = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      this.client.subscribe(topic, { qos }, (error) => {
        if (error) {
          console.error(`Failed to subscribe to ${topic}:`, error);
          reject(error);
          return;
        }

        console.log(`Subscribed to topic: ${topic} (QoS ${qos})`);
        this.subscriptions.set(topic, qos);
        resolve();
      });
    });
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      this.client.unsubscribe(topic, {}, (error) => {
        if (error) {
          console.error(`Failed to unsubscribe from ${topic}:`, error);
          reject(error);
          return;
        }

        console.log(`Unsubscribed from topic: ${topic}`);
        this.subscriptions.delete(topic);
        resolve();
      });
    });
  }

  /**
   * Publish a message to a topic
   */
  async publish(topic: string, payload: string | Buffer, options: PublishOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      this.client.publish(topic, payload, options, (error) => {
        if (error) {
          console.error(`Failed to publish to ${topic}:`, error);
          reject(error);
          return;
        }

        console.log(`Published to topic: ${topic}`);
        resolve();
      });
    });
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.entries()).map(([topic, qos]) => ({
      topic,
      qos,
    }));
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client !== null && this.client.connected;
  }

  /**
   * Resubscribe to all previously subscribed topics
   */
  private resubscribeAll(): void {
    if (!this.client || !this.client.connected) {
      return;
    }

    const topics = Array.from(this.subscriptions.entries());
    if (topics.length === 0) {
      return;
    }

    console.log(`Resubscribing to ${topics.length} topics...`);

    for (const [topic, qos] of topics) {
      this.client.subscribe(topic, { qos }, (error) => {
        if (error) {
          console.error(`Failed to resubscribe to ${topic}:`, error);
        } else {
          console.log(`Resubscribed to topic: ${topic}`);
        }
      });
    }
  }
}
