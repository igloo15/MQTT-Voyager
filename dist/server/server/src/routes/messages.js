"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRouter = void 0;
const express_1 = require("express");
exports.messagesRouter = (0, express_1.Router)();
function encodePayload(msg) {
    if (!msg)
        return msg;
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
exports.messagesRouter
    .post('/search', (req, res) => {
    try {
        const { messageHistory, mqttService } = req.app.locals;
        const filter = req.body || {};
        // Auto-inject current connectionId if not provided
        const currentConnectionId = mqttService.getCurrentConnectionId();
        const filterWithConnection = {
            ...filter,
            connectionId: filter.connectionId || currentConnectionId,
        };
        const messages = messageHistory.searchMessages(filterWithConnection);
        res.json(messages.map(encodePayload));
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .post('/clear', (req, res) => {
    try {
        const { messageHistory, mqttService, topicTree, io } = req.app.locals;
        const currentConnectionId = mqttService.getCurrentConnectionId();
        messageHistory.clearAll(currentConnectionId);
        topicTree.clear();
        io.emit('topics:updated', topicTree.toJSON());
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .get('/stats', (req, res) => {
    try {
        const { messageHistory, mqttService } = req.app.locals;
        const currentConnectionId = mqttService.getCurrentConnectionId();
        res.json(messageHistory.getStatistics(currentConnectionId));
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .post('/reset-stats', (req, res) => {
    try {
        const { messageHistory, mqttService, topicTree, io } = req.app.locals;
        const currentConnectionId = mqttService.getCurrentConnectionId();
        messageHistory.clearAll(currentConnectionId);
        topicTree.clear();
        io.emit('topics:updated', topicTree.toJSON());
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .post('/export', (req, res) => {
    try {
        const { messageHistory, mqttService } = req.app.locals;
        const { filter = {}, format = 'json' } = req.body;
        const currentConnectionId = mqttService.getCurrentConnectionId();
        const filterWithConnection = { ...filter, connectionId: filter.connectionId || currentConnectionId };
        const result = format === 'csv'
            ? messageHistory.exportAsCSV(filterWithConnection)
            : messageHistory.exportAsJSON(filterWithConnection);
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
//# sourceMappingURL=messages.js.map