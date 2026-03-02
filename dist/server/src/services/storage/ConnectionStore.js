"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStore = void 0;
const electron_store_1 = __importDefault(require("electron-store"));
const electron_1 = require("electron");
class ConnectionStore {
    constructor() {
        this.store = new electron_store_1.default({
            name: 'connections',
            defaults: {
                connections: {},
                lastUsedConnectionId: null,
            },
            encryptionKey: 'mqtt-voyager-secure-key',
        });
    }
    /**
     * Save a connection profile
     */
    saveConnection(connection) {
        const connections = this.store.get('connections');
        // Create a copy to avoid mutating the original
        const connectionToSave = { ...connection };
        // Generate ID if not provided
        if (!connectionToSave.id) {
            connectionToSave.id = this.generateId();
        }
        // Encrypt password if safeStorage is available
        if (connectionToSave.password && electron_1.safeStorage.isEncryptionAvailable()) {
            const encryptedPassword = electron_1.safeStorage.encryptString(connectionToSave.password);
            connectionToSave.password = encryptedPassword.toString('base64');
            connectionToSave.passwordEncrypted = true;
        }
        connections[connectionToSave.id] = connectionToSave;
        this.store.set('connections', connections);
        // Update the original connection's ID if it was generated
        if (!connection.id) {
            connection.id = connectionToSave.id;
        }
    }
    /**
     * Get a connection profile by ID
     */
    getConnection(id) {
        const connections = this.store.get('connections');
        const storedConnection = connections[id];
        if (!storedConnection) {
            return null;
        }
        // Create a copy to avoid mutating stored data
        const connection = { ...storedConnection };
        // Decrypt password if it was encrypted
        if (connection.passwordEncrypted && connection.password) {
            try {
                const buffer = Buffer.from(connection.password, 'base64');
                connection.password = electron_1.safeStorage.decryptString(buffer);
                delete connection.passwordEncrypted; // Remove flag for return value
            }
            catch (error) {
                console.error('Failed to decrypt password:', error);
            }
        }
        return connection;
    }
    /**
     * Get all connection profiles
     */
    getAllConnections() {
        const connections = this.store.get('connections');
        return Object.values(connections).map((conn) => {
            // Don't include passwords in the list view
            const { password, ...connectionWithoutPassword } = conn;
            return connectionWithoutPassword;
        });
    }
    /**
     * Delete a connection profile
     */
    deleteConnection(id) {
        const connections = this.store.get('connections');
        if (!connections[id]) {
            return false;
        }
        delete connections[id];
        this.store.set('connections', connections);
        // Clear last used if it was deleted
        if (this.store.get('lastUsedConnectionId') === id) {
            this.store.delete('lastUsedConnectionId');
        }
        return true;
    }
    /**
     * Update an existing connection profile
     */
    updateConnection(id, updates) {
        const connections = this.store.get('connections');
        if (!connections[id]) {
            return false;
        }
        // Encrypt password if changed and safeStorage is available
        if (updates.password && electron_1.safeStorage.isEncryptionAvailable()) {
            const encryptedPassword = electron_1.safeStorage.encryptString(updates.password);
            updates.password = encryptedPassword.toString('base64');
            updates.passwordEncrypted = true;
        }
        connections[id] = {
            ...connections[id],
            ...updates,
            id, // Ensure ID doesn't change
        };
        this.store.set('connections', connections);
        return true;
    }
    /**
     * Set the last used connection ID
     */
    setLastUsedConnection(id) {
        if (id === undefined || id === null) {
            // Use delete() to clear the value instead of setting to undefined/null
            this.store.delete('lastUsedConnectionId');
        }
        else {
            this.store.set('lastUsedConnectionId', id);
        }
    }
    /**
     * Get the last used connection ID
     */
    getLastUsedConnection() {
        return this.store.get('lastUsedConnectionId');
    }
    /**
     * Clear all connection profiles
     */
    clearAll() {
        this.store.set('connections', {});
        this.store.delete('lastUsedConnectionId');
    }
    /**
     * Export connections to JSON (for backup)
     */
    exportConnections() {
        const connections = this.getAllConnections();
        return JSON.stringify(connections, null, 2);
    }
    /**
     * Import connections from JSON
     */
    importConnections(json) {
        try {
            const imported = JSON.parse(json);
            let count = 0;
            for (const connection of imported) {
                // Generate new ID to avoid conflicts
                delete connection.id;
                this.saveConnection(connection);
                count++;
            }
            return count;
        }
        catch (error) {
            console.error('Failed to import connections:', error);
            throw new Error('Invalid connection data');
        }
    }
    /**
     * Generate a unique ID for a connection
     */
    generateId() {
        return `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
}
exports.ConnectionStore = ConnectionStore;
//# sourceMappingURL=ConnectionStore.js.map