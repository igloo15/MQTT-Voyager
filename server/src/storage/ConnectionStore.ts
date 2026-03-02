import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ConnectionConfig } from '../../../shared/types/models';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'connections.json');

// Derive a 32-byte key from ENCRYPTION_KEY env var (must be 64 hex chars = 32 bytes)
const RAW_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const KEY = Buffer.from(RAW_KEY.padEnd(64, '0').slice(0, 64), 'hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, Buffer.from(ivHex, 'hex'));
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

function readFile(): Record<string, any> {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read connections file:', e);
  }
  return { connections: {}, lastUsedConnectionId: null };
}

function writeFile(data: Record<string, any>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class ConnectionStore {
  getAllConnections(): ConnectionConfig[] {
    const data = readFile();
    return Object.values(data.connections || {}).map((conn: any) => {
      const { password, passwordEncrypted, ...rest } = conn;
      return rest as ConnectionConfig;
    });
  }

  getConnection(id: string): ConnectionConfig | null {
    const data = readFile();
    const conn = data.connections?.[id];
    if (!conn) return null;

    const result = { ...conn };
    if (result.passwordEncrypted && result.password) {
      try {
        result.password = decrypt(result.password);
        delete result.passwordEncrypted;
      } catch (e) {
        console.error('Failed to decrypt password:', e);
      }
    }
    return result;
  }

  saveConnection(connection: ConnectionConfig): string {
    const data = readFile();
    if (!data.connections) data.connections = {};

    const conn = { ...connection, id: connection.id || generateId() };
    if (conn.password) {
      conn.password = encrypt(conn.password);
      (conn as any).passwordEncrypted = true;
    }

    data.connections[conn.id!] = conn;
    writeFile(data);
    return conn.id!;
  }

  updateConnection(id: string, updates: Partial<ConnectionConfig>): boolean {
    const data = readFile();
    if (!data.connections?.[id]) return false;

    const update = { ...updates };
    if (update.password) {
      update.password = encrypt(update.password);
      (update as any).passwordEncrypted = true;
    }

    data.connections[id] = { ...data.connections[id], ...update, id };
    writeFile(data);
    return true;
  }

  deleteConnection(id: string): boolean {
    const data = readFile();
    if (!data.connections?.[id]) return false;

    delete data.connections[id];
    if (data.lastUsedConnectionId === id) {
      data.lastUsedConnectionId = null;
    }
    writeFile(data);
    return true;
  }

  setLastUsedConnection(id: string | undefined): void {
    const data = readFile();
    data.lastUsedConnectionId = id || null;
    writeFile(data);
  }

  getLastUsedConnection(): string | null {
    return readFile().lastUsedConnectionId || null;
  }

  exportConnections(): string {
    return JSON.stringify(this.getAllConnections(), null, 2);
  }

  importConnections(json: string): number {
    const imported = JSON.parse(json) as ConnectionConfig[];
    let count = 0;
    for (const connection of imported) {
      delete connection.id;
      this.saveConnection(connection);
      count++;
    }
    return count;
  }

  clearAll(): void {
    writeFile({ connections: {}, lastUsedConnectionId: null });
  }
}
