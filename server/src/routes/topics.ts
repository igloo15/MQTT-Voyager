import { Router } from 'express';

export const topicsRouter = Router();

topicsRouter.get('/tree', (req, res) => {
  try {
    res.json(req.app.locals.topicTree.toJSON());
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
