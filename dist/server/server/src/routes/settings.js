"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
exports.settingsRouter = (0, express_1.Router)();
exports.settingsRouter
    .get('/', (req, res) => {
    try {
        res.json(req.app.locals.settingsStore.get());
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
})
    .put('/', (req, res) => {
    try {
        req.app.locals.settingsStore.setAll(req.body);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
//# sourceMappingURL=settings.js.map