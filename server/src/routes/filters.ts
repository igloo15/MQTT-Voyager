import { Router } from 'express';

export const filtersRouter = Router();

filtersRouter
  .get('/', (req, res) => {
    try {
      res.json(req.app.locals.settingsStore.get('filterPresets') || []);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  })
  .post('/', (req, res) => {
    try {
      const store = req.app.locals.settingsStore;
      const presets = [...(store.get('filterPresets') || []), req.body];
      store.set('filterPresets', presets);
      res.json(req.body);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  })
  .delete('/:id', (req, res) => {
    try {
      const store = req.app.locals.settingsStore;
      const presets = (store.get('filterPresets') || []).filter(
        (p: any) => p.id !== req.params.id
      );
      store.set('filterPresets', presets);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
