import { Router } from 'express';
import type { MessageFilter } from '../../../shared/types/models';

export const messagesRouter = Router();

function encodePayload(msg: any) {
  if (!msg) return msg;
  if (Buffer.isBuffer(msg.payload)) {
    return {
      ...msg,
      payload: msg.isMsgpack
        ? msg.payload.toString('base64')
        : msg.payload.toString('utf-8'),
    };
  }
  return msg;
}

messagesRouter
  .post('/search', (req, res) => {
    try {
      const { messageHistory, mqttService } = req.app.locals;
      const filter: MessageFilter = req.body || {};

      // Auto-inject current connectionId if not provided
      const currentConnectionId = mqttService.getCurrentConnectionId();
      const filterWithConnection: MessageFilter = {
        ...filter,
        connectionId: filter.connectionId || currentConnectionId,
      };

      const messages = messageHistory.searchMessages(filterWithConnection);
      res.json(messages.map(encodePayload));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  })
  .post('/clear', (req, res) => {
    try {
      const { messageHistory, mqttService, topicTree, io } = req.app.locals;
      const currentConnectionId = mqttService.getCurrentConnectionId();
      messageHistory.clearAll(currentConnectionId);
      topicTree.clear();
      io.emit('topics:updated', topicTree.toJSON());
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  })
  .get('/stats', (req, res) => {
    try {
      const { messageHistory, mqttService } = req.app.locals;
      const currentConnectionId = mqttService.getCurrentConnectionId();
      res.json(messageHistory.getStatistics(currentConnectionId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  })
  .post('/reset-stats', (req, res) => {
    try {
      const { messageHistory, mqttService, topicTree, io } = req.app.locals;
      const currentConnectionId = mqttService.getCurrentConnectionId();
      messageHistory.clearAll(currentConnectionId);
      topicTree.clear();
      io.emit('topics:updated', topicTree.toJSON());
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  })
  .post('/export', (req, res) => {
    try {
      const { messageHistory, mqttService } = req.app.locals;
      const { filter = {}, format = 'json' }: { filter: MessageFilter; format: 'json' | 'csv' } = req.body;
      const currentConnectionId = mqttService.getCurrentConnectionId();
      const filterWithConnection = { ...filter, connectionId: filter.connectionId || currentConnectionId };
      const result = format === 'csv'
        ? messageHistory.exportAsCSV(filterWithConnection)
        : messageHistory.exportAsJSON(filterWithConnection);
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
