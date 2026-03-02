"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionsRouter = void 0;
const express_1 = require("express");
exports.connectionsRouter = (0, express_1.Router)();
exports.connectionsRouter
    .get('/', (req, res) => {
    try {
        res.json(req.app.locals.connectionStore.getAllConnections());
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .get('/export', (req, res) => {
    try {
        res.json(req.app.locals.connectionStore.exportConnections());
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .get('/last-used', (req, res) => {
    try {
        const lastUsedId = req.app.locals.connectionStore.getLastUsedConnection();
        if (lastUsedId) {
            const conn = req.app.locals.connectionStore.getConnection(lastUsedId);
            res.json(conn || null);
        }
        else {
            res.json(null);
        }
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .get('/current-id', (req, res) => {
    try {
        const id = req.app.locals.mqttService.getCurrentConnectionId() || null;
        res.json(id);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .get('/:id', (req, res) => {
    try {
        const conn = req.app.locals.connectionStore.getConnection(req.params.id);
        conn ? res.json(conn) : res.status(404).json({ error: 'Not found' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .post('/', (req, res) => {
    try {
        const id = req.app.locals.connectionStore.saveConnection(req.body);
        res.json(id);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .post('/import', (req, res) => {
    try {
        const count = req.app.locals.connectionStore.importConnections(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
        res.json(count);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .put('/:id', (req, res) => {
    try {
        const success = req.app.locals.connectionStore.updateConnection(req.params.id, req.body);
        res.json(success);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .delete('/:id', (req, res) => {
    try {
        const success = req.app.locals.connectionStore.deleteConnection(req.params.id);
        res.json(success);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
//# sourceMappingURL=connections.js.map