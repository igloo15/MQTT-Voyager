"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topicsRouter = void 0;
const express_1 = require("express");
exports.topicsRouter = (0, express_1.Router)();
exports.topicsRouter.get('/tree', (req, res) => {
    try {
        res.json(req.app.locals.topicTree.toJSON());
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
//# sourceMappingURL=topics.js.map