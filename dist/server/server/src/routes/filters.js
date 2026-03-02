"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filtersRouter = void 0;
const express_1 = require("express");
exports.filtersRouter = (0, express_1.Router)();
exports.filtersRouter
    .get('/', (req, res) => {
    try {
        res.json(req.app.locals.settingsStore.get('filterPresets') || []);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .post('/', (req, res) => {
    try {
        const store = req.app.locals.settingsStore;
        const presets = [...(store.get('filterPresets') || []), req.body];
        store.set('filterPresets', presets);
        res.json(req.body);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .delete('/:id', (req, res) => {
    try {
        const store = req.app.locals.settingsStore;
        const presets = (store.get('filterPresets') || []).filter((p) => p.id !== req.params.id);
        store.set('filterPresets', presets);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
//# sourceMappingURL=filters.js.map