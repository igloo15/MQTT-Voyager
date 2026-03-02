"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStore = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const DATA_DIR = process.env.DATA_DIR || path_1.default.join(process.cwd(), 'data');
const FILE = path_1.default.join(DATA_DIR, 'connections.json');
// Derive a 32-byte key from ENCRYPTION_KEY env var (must be 64 hex chars = 32 bytes)
const RAW_KEY = process.env.ENCRYPTION_KEY || crypto_1.default.randomBytes(32).toString('hex');
const KEY = Buffer.from(RAW_KEY.padEnd(64, '0').slice(0, 64), 'hex');
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', KEY, iv);
    const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
function decrypt(text) {
    const [ivHex, encrypted] = text.split(':');
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', KEY, Buffer.from(ivHex, 'hex'));
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
function readFile() {
    try {
        if (fs_1.default.existsSync(FILE)) {
            return JSON.parse(fs_1.default.readFileSync(FILE, 'utf8'));
        }
    }
    catch (e) {
        console.error('Failed to read connections file:', e);
    }
    return { connections: {}, lastUsedConnectionId: null };
}
function writeFile(data) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    fs_1.default.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
function generateId() {
    return `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
class ConnectionStore {
    getAllConnections() {
        const data = readFile();
        return Object.values(data.connections || {}).map((conn) => {
            const { password, passwordEncrypted, ...rest } = conn;
            return rest;
        });
    }
    getConnection(id) {
        const data = readFile();
        const conn = data.connections?.[id];
        if (!conn)
            return null;
        const result = { ...conn };
        if (result.passwordEncrypted && result.password) {
            try {
                result.password = decrypt(result.password);
                delete result.passwordEncrypted;
            }
            catch (e) {
                console.error('Failed to decrypt password:', e);
            }
        }
        return result;
    }
    saveConnection(connection) {
        const data = readFile();
        if (!data.connections)
            data.connections = {};
        const conn = { ...connection, id: connection.id || generateId() };
        if (conn.password) {
            conn.password = encrypt(conn.password);
            conn.passwordEncrypted = true;
        }
        data.connections[conn.id] = conn;
        writeFile(data);
        return conn.id;
    }
    updateConnection(id, updates) {
        const data = readFile();
        if (!data.connections?.[id])
            return false;
        const update = { ...updates };
        if (update.password) {
            update.password = encrypt(update.password);
            update.passwordEncrypted = true;
        }
        data.connections[id] = { ...data.connections[id], ...update, id };
        writeFile(data);
        return true;
    }
    deleteConnection(id) {
        const data = readFile();
        if (!data.connections?.[id])
            return false;
        delete data.connections[id];
        if (data.lastUsedConnectionId === id) {
            data.lastUsedConnectionId = null;
        }
        writeFile(data);
        return true;
    }
    setLastUsedConnection(id) {
        const data = readFile();
        data.lastUsedConnectionId = id || null;
        writeFile(data);
    }
    getLastUsedConnection() {
        return readFile().lastUsedConnectionId || null;
    }
    exportConnections() {
        return JSON.stringify(this.getAllConnections(), null, 2);
    }
    importConnections(json) {
        const imported = JSON.parse(json);
        let count = 0;
        for (const connection of imported) {
            delete connection.id;
            this.saveConnection(connection);
            count++;
        }
        return count;
    }
    clearAll() {
        writeFile({ connections: {}, lastUsedConnectionId: null });
    }
}
exports.ConnectionStore = ConnectionStore;
//# sourceMappingURL=ConnectionStore.js.map