"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
// IPC channel names
exports.IPC_CHANNELS = {
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
    CONNECTION_GET_CURRENT: 'connection:get-current',
    CONNECTION_EXPORT: 'connection:export',
    CONNECTION_IMPORT: 'connection:import',
    // Messages
    MESSAGE_SEARCH: 'message:search',
    MESSAGE_CLEAR: 'message:clear',
    MESSAGE_EXPORT: 'message:export',
    MESSAGE_GET_STATS: 'message:get-stats',
    MESSAGE_RESET_STATS: 'message:reset-stats',
    // Topic Tree
    TOPIC_TREE_GET: 'topic-tree:get',
    TOPIC_TREE_UPDATED: 'topic-tree:updated',
    // Message Filtering (events)
    MESSAGE_FILTER_TOPIC: 'message:filter-topic',
    // Connection events
    CONNECTION_CHANGED: 'connection:changed',
};
//# sourceMappingURL=ipc.types.js.map