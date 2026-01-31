import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import type { MqttMessage, MessageFilter, Statistics } from '../../../shared/types/models';

export class MessageHistory {
  private db: Database.Database;
  private insertStmt: Database.Statement;
  private selectStmt: Database.Statement;

  constructor(dbPath?: string) {
    const userDataPath = app.getPath('userData');
    const defaultDbPath = path.join(userDataPath, 'mqtt-messages.db');

    this.db = new Database(dbPath || defaultDbPath);
    this.initializeDatabase();

    // Prepare statements for better performance
    this.insertStmt = this.db.prepare(`
      INSERT INTO messages (id, topic, payload, qos, retained, timestamp, connection_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.selectStmt = this.db.prepare(`
      SELECT * FROM messages
      ORDER BY timestamp DESC
      LIMIT ?
    `);
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    // Create messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        payload BLOB,
        qos INTEGER,
        retained INTEGER,
        timestamp INTEGER NOT NULL,
        connection_id TEXT
      );
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_topic ON messages(topic);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_connection ON messages(connection_id);
    `);

    // Create FTS5 virtual table for full-text search on payload
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        payload,
        content=messages,
        content_rowid=rowid
      );
    `);

    // Create triggers to keep FTS table in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, payload) VALUES (new.rowid, new.payload);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, payload) VALUES('delete', old.rowid, old.payload);
      END;
    `);

    console.log('Database initialized successfully');
  }

  /**
   * Add a message to the history
   */
  addMessage(message: MqttMessage): void {
    try {
      const payload = Buffer.isBuffer(message.payload)
        ? message.payload
        : Buffer.from(message.payload);

      this.insertStmt.run(
        message.id,
        message.topic,
        payload,
        message.qos,
        message.retained ? 1 : 0,
        message.timestamp,
        message.connectionId || null
      );
    } catch (error) {
      console.error('Failed to add message to history:', error);
    }
  }

  /**
   * Search messages with filters
   */
  searchMessages(filter: MessageFilter = {}): MqttMessage[] {
    const conditions: string[] = [];
    const params: any[] = [];

    // Topic filter (supports wildcards)
    if (filter.topic) {
      if (filter.topic.includes('+') || filter.topic.includes('#')) {
        // Convert MQTT wildcards to SQL LIKE pattern
        const pattern = filter.topic
          .replace(/\+/g, '%')
          .replace(/#/g, '%');
        conditions.push('topic LIKE ?');
        params.push(pattern);
      } else {
        conditions.push('topic = ?');
        params.push(filter.topic);
      }
    }

    // Time range filters
    if (filter.startTime) {
      conditions.push('timestamp >= ?');
      params.push(filter.startTime);
    }

    if (filter.endTime) {
      conditions.push('timestamp <= ?');
      params.push(filter.endTime);
    }

    // QoS filter
    if (filter.qos !== undefined) {
      conditions.push('qos = ?');
      params.push(filter.qos);
    }

    // Retained filter
    if (filter.retained !== undefined) {
      conditions.push('retained = ?');
      params.push(filter.retained ? 1 : 0);
    }

    // Payload search using FTS
    let query = 'SELECT * FROM messages';

    if (filter.payloadSearch) {
      query = `
        SELECT m.* FROM messages m
        INNER JOIN messages_fts fts ON m.rowid = fts.rowid
        WHERE messages_fts MATCH ?
      `;
      params.unshift(filter.payloadSearch);
    }

    // Add WHERE clause for other conditions
    if (conditions.length > 0) {
      if (filter.payloadSearch) {
        query += ' AND ' + conditions.join(' AND ');
      } else {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }

    // Add ORDER BY and LIMIT
    query += ' ORDER BY timestamp DESC';

    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }

    try {
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => ({
        id: row.id,
        topic: row.topic,
        payload: row.payload,
        qos: row.qos,
        retained: row.retained === 1,
        timestamp: row.timestamp,
        connectionId: row.connection_id,
      }));
    } catch (error) {
      console.error('Failed to search messages:', error);
      return [];
    }
  }

  /**
   * Get recent messages
   */
  getRecentMessages(limit: number = 100): MqttMessage[] {
    try {
      const rows = this.selectStmt.all(limit) as any[];

      return rows.map((row) => ({
        id: row.id,
        topic: row.topic,
        payload: row.payload,
        qos: row.qos,
        retained: row.retained === 1,
        timestamp: row.timestamp,
        connectionId: row.connection_id,
      }));
    } catch (error) {
      console.error('Failed to get recent messages:', error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): Statistics {
    try {
      // Total message count
      const totalResult = this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as any;
      const totalMessages = totalResult.count;

      // Messages by topic
      const topicResults = this.db.prepare(`
        SELECT topic, COUNT(*) as count
        FROM messages
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 10
      `).all() as any[];

      const messagesByTopic: Record<string, number> = {};
      topicResults.forEach((row) => {
        messagesByTopic[row.topic] = row.count;
      });

      // Unique topic count
      const topicCountResult = this.db.prepare('SELECT COUNT(DISTINCT topic) as count FROM messages').get() as any;
      const topicCount = topicCountResult.count;

      // Messages per second (last minute)
      const oneMinuteAgo = Date.now() - 60000;
      const recentResult = this.db.prepare(
        'SELECT COUNT(*) as count FROM messages WHERE timestamp >= ?'
      ).get(oneMinuteAgo) as any;
      const messagesPerSecond = recentResult.count / 60;

      // Data volume (approximate)
      const sizeResult = this.db.prepare('SELECT SUM(LENGTH(payload)) as size FROM messages').get() as any;
      const dataVolume = sizeResult.size || 0;

      return {
        totalMessages,
        messagesByTopic,
        messagesPerSecond,
        dataVolume,
        topicCount,
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalMessages: 0,
        messagesByTopic: {},
        messagesPerSecond: 0,
        dataVolume: 0,
        topicCount: 0,
      };
    }
  }

  /**
   * Clear all messages
   */
  clearAll(): void {
    try {
      this.db.exec('DELETE FROM messages');
      console.log('All messages cleared');
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  }

  /**
   * Clear messages older than a timestamp
   */
  clearOlderThan(timestamp: number): void {
    try {
      const stmt = this.db.prepare('DELETE FROM messages WHERE timestamp < ?');
      const result = stmt.run(timestamp);
      console.log(`Cleared ${result.changes} old messages`);
    } catch (error) {
      console.error('Failed to clear old messages:', error);
    }
  }

  /**
   * Export messages as JSON
   */
  exportAsJSON(filter: MessageFilter = {}): string {
    const messages = this.searchMessages(filter);

    const exportData = messages.map((msg) => ({
      id: msg.id,
      topic: msg.topic,
      payload: msg.payload.toString('utf-8'),
      qos: msg.qos,
      retained: msg.retained,
      timestamp: msg.timestamp,
      datetime: new Date(msg.timestamp).toISOString(),
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export messages as CSV
   */
  exportAsCSV(filter: MessageFilter = {}): string {
    const messages = this.searchMessages(filter);

    const headers = ['ID', 'Topic', 'Payload', 'QoS', 'Retained', 'Timestamp', 'DateTime'];
    const rows = messages.map((msg) => [
      msg.id,
      msg.topic,
      msg.payload.toString('utf-8').replace(/"/g, '""'), // Escape quotes
      msg.qos,
      msg.retained,
      msg.timestamp,
      new Date(msg.timestamp).toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Close the database
   */
  close(): void {
    this.db.close();
  }
}
