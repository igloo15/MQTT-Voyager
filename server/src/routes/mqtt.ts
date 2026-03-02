import { Router } from 'express';
import type { ConnectionConfig, QoS, PublishOptions } from '../../../shared/types/models';

export const mqttRouter = Router();

mqttRouter.post('/connect', async (req, res) => {
  try {
    const { mqttService, connectionStore, topicTree, io } = req.app.locals;
    const config: ConnectionConfig = req.body;

    topicTree.clear();
    await mqttService.connect(config);

    if (config.id) {
      connectionStore.setLastUsedConnection(config.id);
    }

    io.emit('connection:changed', config.id || null);
    io.emit('topics:updated', topicTree.toJSON());

    // Auto-subscribe to default subscriptions
    if (config.defaultSubscriptions && config.defaultSubscriptions.length > 0) {
      for (const sub of config.defaultSubscriptions) {
        try {
          await mqttService.subscribe(sub.topic, sub.qos);
          topicTree.markSubscribed(sub.topic, true);
        } catch (error) {
          console.error(`Failed to auto-subscribe to ${sub.topic}:`, error);
        }
      }
    }

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

mqttRouter.post('/disconnect', async (req, res) => {
  try {
    const { mqttService, connectionStore, topicTree, io } = req.app.locals;
    await mqttService.disconnect(true);
    topicTree.clear();
    connectionStore.setLastUsedConnection(undefined);
    io.emit('connection:changed', null);
    io.emit('topics:updated', topicTree.toJSON());
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

mqttRouter.post('/subscribe', async (req, res) => {
  try {
    const { mqttService, topicTree, io } = req.app.locals;
    const { topic, qos = 0 }: { topic: string; qos: QoS } = req.body;
    await mqttService.subscribe(topic, qos);
    topicTree.markSubscribed(topic, true);
    io.emit('topics:updated', topicTree.toJSON());
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

mqttRouter.post('/unsubscribe', async (req, res) => {
  try {
    const { mqttService, topicTree, io } = req.app.locals;
    const { topic }: { topic: string } = req.body;
    await mqttService.unsubscribe(topic);
    topicTree.markSubscribed(topic, false);
    io.emit('topics:updated', topicTree.toJSON());
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

mqttRouter.post('/publish', async (req, res) => {
  try {
    const { mqttService } = req.app.locals;
    const { topic, payload, qos = 0, retain = false, userProperties, isBase64Encoded }: {
      topic: string;
      payload: string;
      qos?: QoS;
      retain?: boolean;
      userProperties?: Record<string, string>;
      isBase64Encoded?: boolean;
    } = req.body;

    const finalPayload = isBase64Encoded ? Buffer.from(payload, 'base64') : payload;
    const options: PublishOptions = {
      qos,
      retain,
      userProperties,
      isBase64Encoded,
    };

    await mqttService.publish(topic, finalPayload, options);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

mqttRouter.get('/subscriptions', (req, res) => {
  try {
    res.json(req.app.locals.mqttService.getSubscriptions());
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
