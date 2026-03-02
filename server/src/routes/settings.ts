import { Router } from 'express';

export const settingsRouter = Router();

settingsRouter
  .get('/', (req, res) => {
    try {
      res.json(req.app.locals.settingsStore.get());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  })
  .put('/', (req, res) => {
    try {
      req.app.locals.settingsStore.setAll(req.body);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
