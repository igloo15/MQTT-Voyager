"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttService = void 0;
const mqtt = __importStar(require("mqtt"));
const events_1 = require("events");
class MqttService extends events_1.EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.config = null;
        this.status = 'disconnected';
        this.subscriptions = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.isManualDisconnect = false;
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }
    /**
     * Log messages only in development mode
     */
    log(...args) {
        if (this.isDevelopment) {
            console.log(...args);
        }
    }
    /**
     * Connect to MQTT broker
     */
    async connect(config) {
        // Clean up any existing connection first - use force close to prevent reconnection
        if (this.client) {
            await this.disconnect(true);
            // Small delay to ensure client is fully cleaned up
            await new Promise(resolve => setTimeout(resolve, 100));
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
                const options = {
                    clientId: config.clientId || `mqtt_voyager_${Math.random().toString(16).slice(2, 8)}`,
                    username: config.username,
                    password: config.password,
                    clean: config.cleanSession !== false,
                    keepalive: config.keepalive || 60,
                    reconnectPeriod: config.reconnectPeriod || 1000,
                    connectTimeout: config.connectTimeout || 30000,
                    protocolVersion: config.protocolVersion || 5, // Default to MQTT 5.0
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
                this.log(`Connecting to MQTT broker: ${brokerUrl}`);
                this.log(`MQTT options:`, {
                    clientId: options.clientId,
                    clean: options.clean,
                    keepalive: options.keepalive,
                    reconnectPeriod: options.reconnectPeriod,
                });
                this.client = mqtt.connect(brokerUrl, options);
                // Set up event handlers - these will be cleaned up in disconnect()
                const onConnect = () => {
                    this.log('MQTT connected successfully');
                    this.status = 'connected';
                    this.reconnectAttempts = 0;
                    this.emit('status', this.status);
                    resolve();
                    // Resubscribe to previous topics
                    this.resubscribeAll();
                };
                const onError = (error) => {
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
                    this.log('MQTT reconnecting...');
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
                    this.log('MQTT connection closed');
                    if (this.status !== 'disconnected' && !this.isManualDisconnect) {
                        this.status = 'disconnected';
                        this.emit('status', this.status);
                    }
                };
                const onMessage = (topic, payload, packet) => {
                    const message = {
                        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                        topic,
                        payload,
                        qos: packet.qos,
                        retained: packet.retain,
                        timestamp: Date.now(),
                        connectionId: this.config?.id,
                        userProperties: packet.properties?.userProperties,
                    };
                    this.emit('message', message);
                };
                const onOffline = () => {
                    this.log('MQTT client offline');
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
                this.client._customHandlers = {
                    onConnect,
                    onError,
                    onReconnect,
                    onClose,
                    onMessage,
                    onOffline,
                };
            }
            catch (error) {
                this.status = 'error';
                this.emit('status', this.status);
                reject(error);
            }
        });
    }
    /**
     * Disconnect from MQTT broker
     * @param force - If true, forces immediate disconnection without waiting for in-flight messages
     */
    async disconnect(force = false) {
        return new Promise((resolve) => {
            if (!this.client) {
                this.status = 'disconnected';
                this.emit('status', this.status);
                this.isManualDisconnect = false;
                resolve();
                return;
            }
            this.isManualDisconnect = true;
            // Disable automatic reconnection before disconnecting
            if (force) {
                this.client.options.reconnectPeriod = 0;
            }
            // Remove all event listeners before disconnecting
            const handlers = this.client._customHandlers;
            if (handlers) {
                this.client.removeListener('connect', handlers.onConnect);
                this.client.removeListener('error', handlers.onError);
                this.client.removeListener('reconnect', handlers.onReconnect);
                this.client.removeListener('close', handlers.onClose);
                this.client.removeListener('message', handlers.onMessage);
                this.client.removeListener('offline', handlers.onOffline);
            }
            else {
                // Fallback: remove all listeners
                this.client.removeAllListeners();
            }
            this.client.end(force, {}, () => {
                this.log(`MQTT disconnected (force: ${force})`);
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
    async subscribe(topic, qos = 0) {
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
                this.log(`Subscribed to topic: ${topic} (QoS ${qos})`);
                this.subscriptions.set(topic, qos);
                resolve();
            });
        });
    }
    /**
     * Unsubscribe from a topic
     */
    async unsubscribe(topic) {
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
                this.log(`Unsubscribed from topic: ${topic}`);
                this.subscriptions.delete(topic);
                resolve();
            });
        });
    }
    /**
     * Publish a message to a topic
     */
    async publish(topic, payload, options) {
        return new Promise((resolve, reject) => {
            if (!this.client || !this.client.connected) {
                reject(new Error('Not connected to MQTT broker'));
                return;
            }
            // Build publish options with user properties for MQTT 5.0
            const publishOptions = {
                qos: options.qos,
                retain: options.retain,
                properties: options.userProperties ? {
                    userProperties: options.userProperties,
                } : undefined,
            };
            this.client.publish(topic, payload, publishOptions, (error) => {
                if (error) {
                    console.error(`Failed to publish to ${topic}:`, error);
                    reject(error);
                    return;
                }
                this.log(`Published to topic: ${topic}`);
                resolve();
            });
        });
    }
    /**
     * Get current connection ID
     */
    getCurrentConnectionId() {
        return this.config?.id;
    }
    /**
     * Get all active subscriptions
     */
    getSubscriptions() {
        return Array.from(this.subscriptions.entries()).map(([topic, qos]) => ({
            topic,
            qos,
        }));
    }
    /**
     * Get current connection status
     */
    getStatus() {
        return this.status;
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.client !== null && this.client.connected;
    }
    /**
     * Resubscribe to all previously subscribed topics
     */
    resubscribeAll() {
        if (!this.client || !this.client.connected) {
            return;
        }
        const topics = Array.from(this.subscriptions.entries());
        if (topics.length === 0) {
            return;
        }
        this.log(`Resubscribing to ${topics.length} topics...`);
        for (const [topic, qos] of topics) {
            this.client.subscribe(topic, { qos }, (error) => {
                if (error) {
                    console.error(`Failed to resubscribe to ${topic}:`, error);
                }
                else {
                    this.log(`Resubscribed to topic: ${topic}`);
                }
            });
        }
    }
}
exports.MqttService = MqttService;
//# sourceMappingURL=MqttService.js.map