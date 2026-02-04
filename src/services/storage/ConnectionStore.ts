import Store from 'electron-store';
import { safeStorage } from 'electron';
import type { ConnectionConfig } from '../../../shared/types/models';

export class ConnectionStore {
  private store: any; // Using any to avoid type issues with electron-store v11

  constructor() {
    this.store = new Store({
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
  saveConnection(connection: ConnectionConfig): void {
    const connections = this.store.get('connections') as Record<string, ConnectionConfig>;

    // Create a copy to avoid mutating the original
    const connectionToSave = { ...connection };

    // Generate ID if not provided
    if (!connectionToSave.id) {
      connectionToSave.id = this.generateId();
    }

    // Encrypt password if safeStorage is available
    if (connectionToSave.password && safeStorage.isEncryptionAvailable()) {
      const encryptedPassword = safeStorage.encryptString(connectionToSave.password);
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
  getConnection(id: string): ConnectionConfig | null {
    const connections = this.store.get('connections') as Record<string, ConnectionConfig>;
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
        connection.password = safeStorage.decryptString(buffer);
        delete connection.passwordEncrypted; // Remove flag for return value
      } catch (error) {
        console.error('Failed to decrypt password:', error);
      }
    }

    return connection;
  }

  /**
   * Get all connection profiles
   */
  getAllConnections(): ConnectionConfig[] {
    const connections = this.store.get('connections') as Record<string, ConnectionConfig>;
    return Object.values(connections).map((conn: ConnectionConfig) => {
      // Don't include passwords in the list view
      const { password, ...connectionWithoutPassword } = conn;
      return connectionWithoutPassword as ConnectionConfig;
    });
  }

  /**
   * Delete a connection profile
   */
  deleteConnection(id: string): boolean {
    const connections = this.store.get('connections') as Record<string, ConnectionConfig>;

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
  updateConnection(id: string, updates: Partial<ConnectionConfig>): boolean {
    const connections = this.store.get('connections') as Record<string, ConnectionConfig>;

    if (!connections[id]) {
      return false;
    }

    // Encrypt password if changed and safeStorage is available
    if (updates.password && safeStorage.isEncryptionAvailable()) {
      const encryptedPassword = safeStorage.encryptString(updates.password);
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
  setLastUsedConnection(id: string | undefined): void {
    if (id === undefined || id === null) {
      // Use delete() to clear the value instead of setting to undefined/null
      this.store.delete('lastUsedConnectionId');
    } else {
      this.store.set('lastUsedConnectionId', id);
    }
  }

  /**
   * Get the last used connection ID
   */
  getLastUsedConnection(): string | null {
    return this.store.get('lastUsedConnectionId') as string | null;
  }

  /**
   * Clear all connection profiles
   */
  clearAll(): void {
    this.store.set('connections', {});
    this.store.delete('lastUsedConnectionId');
  }

  /**
   * Export connections to JSON (for backup)
   */
  exportConnections(): string {
    const connections = this.getAllConnections();
    return JSON.stringify(connections, null, 2);
  }

  /**
   * Import connections from JSON
   */
  importConnections(json: string): number {
    try {
      const imported = JSON.parse(json) as ConnectionConfig[];
      let count = 0;

      for (const connection of imported) {
        // Generate new ID to avoid conflicts
        delete connection.id;
        this.saveConnection(connection);
        count++;
      }

      return count;
    } catch (error) {
      console.error('Failed to import connections:', error);
      throw new Error('Invalid connection data');
    }
  }

  /**
   * Generate a unique ID for a connection
   */
  private generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
