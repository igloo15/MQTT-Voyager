# MQTT Voyager

A desktop application for visualizing and debugging MQTT messages, built with Electron, React, and TypeScript.

## ✅ Migration Complete!

Successfully migrated from Vite to Electron Forge, resolving the Windows module resolution issues.

## Tech Stack

- **Framework**: Electron + React 18
- **Language**: TypeScript
- **Build Tool**: Electron Forge with Webpack
- **UI Library**: Ant Design
- **State Management**: Zustand (ready to use)
- **MQTT Client**: mqtt.js
- **Data Storage**: electron-store (profiles) + better-sqlite3 (planned for message history)

## Project Structure

```
mqtt-voyager-forge/
├── shared/                    # Shared types between main and renderer
│   └── types/
│       └── ipc.types.ts      # Type-safe IPC contracts
├── src/
│   ├── index.ts              # Electron main process
│   ├── preload.ts            # IPC bridge (contextBridge)
│   ├── renderer.tsx          # React entry point
│   ├── renderer/
│   │   └── App.tsx          # Main React component
│   ├── index.html           # HTML template
│   └── index.css            # Global styles
├── forge.config.ts          # Electron Forge configuration
├── webpack.*.config.ts      # Webpack configurations
└── package.json             # Dependencies and scripts
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm start
```

This will:
- Build the Electron main process
- Build the preload script
- Start a Webpack dev server for the React renderer
- Launch the Electron app with hot reload

### Build for Production

```bash
npm run package
```

Creates distributable packages in the `out` folder.

### Platform-Specific Builds

```bash
npm run make          # Build for current platform
```

## Features Implemented (Phase 1)

✅ **Project Foundation**
- Electron main process with window management
- React UI with Ant Design
- Type-safe IPC communication
- Preload script with contextBridge
- TypeScript configuration
- ESLint and Prettier setup

✅ **Working IPC Test**
- Ping/pong handler demonstrating main ↔ renderer communication
- Click "Test IPC Communication" button to verify it works!

## Next Steps (Phase 2+)

The following features are planned according to the original implementation plan:

### Phase 2: MQTT Core Service
- [ ] Create MqttService class in main process
- [ ] Implement connection lifecycle management
- [ ] Add subscribe/unsubscribe functionality
- [ ] Implement publish functionality
- [ ] Handle QoS levels (0, 1, 2)
- [ ] Auto-reconnect with exponential backoff
- [ ] Set up SQLite schema for message history

### Phase 3: Connection Management
- [ ] Save and load connection profiles with electron-store
- [ ] Build ConnectionForm component
- [ ] Support mqtt/mqtts/ws/wss protocols
- [ ] Encrypt passwords with safeStorage API
- [ ] TLS/SSL configuration

### Phase 4: Topic Tree Visualization
- [ ] Build topic tree data structure
- [ ] Create TopicTree component with Ant Design Tree
- [ ] Show message count per topic
- [ ] Support wildcard subscriptions (+, #)
- [ ] Context menu for actions

### Phase 5: Message Viewer & Publisher
- [ ] Message list with virtual scrolling
- [ ] Message detail panel with syntax highlighting
- [ ] JSON/XML/binary payload views
- [ ] Message publisher UI
- [ ] Message history persistence

### Phase 6: Search & Filtering
- [ ] Topic search with regex support
- [ ] Payload content search
- [ ] Time range filters
- [ ] SQLite full-text search

### Phase 7: Message History & Replay
- [ ] Export messages (JSON, CSV)
- [ ] Message replay functionality
- [ ] Statistics dashboard
- [ ] Retention policies

### Phase 8: Polish & Packaging
- [ ] Dark mode support
- [ ] Keyboard shortcuts
- [ ] Comprehensive error handling
- [ ] Loading states
- [ ] Create installers for Windows/Mac/Linux

## Development Notes

### Key Files

**Main Process** ([src/index.ts](src/index.ts))
- Electron app initialization
- Window creation
- IPC handler registration

**Preload Script** ([src/preload.ts](src/preload.ts))
- Secure IPC bridge using contextBridge
- Exposes `window.electronAPI` to renderer

**Renderer** ([src/renderer.tsx](src/renderer.tsx), [src/renderer/App.tsx](src/renderer/App.tsx))
- React application entry
- Ant Design UI components
- IPC communication from renderer side

**IPC Types** ([shared/types/ipc.types.ts](shared/types/ipc.types.ts))
- Type-safe IPC channel definitions
- Shared between main and renderer

### Adding New IPC Handlers

1. **Define channel** in `shared/types/ipc.types.ts`:
   ```typescript
   export const IPC_CHANNELS = {
     MY_CHANNEL: 'my:channel',
     // ...
   } as const;
   ```

2. **Register handler** in `src/index.ts`:
   ```typescript
   ipcMain.handle(IPC_CHANNELS.MY_CHANNEL, async (_event, arg) => {
     // Handle request
     return result;
   });
   ```

3. **Call from renderer** in React components:
   ```typescript
   const result = await window.electronAPI.invoke(IPC_CHANNELS.MY_CHANNEL, arg);
   ```

### Hot Reload

- **Renderer changes**: Auto-reload (Webpack HMR)
- **Main/Preload changes**: Type `rs` in terminal to restart

## Troubleshooting

### TypeScript Alias Warnings

If you see TypeScript errors about `@shared/*` imports, they're cosmetic. Webpack resolves them correctly. The warning appears during type-checking but doesn't block compilation.

### Module Not Found

If you get module resolution errors:
1. Stop the dev server
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install`
4. Run `npm start`

## Migration History

This project was migrated from a Vite-based setup to Electron Forge to resolve Windows-specific module resolution issues with the `electron` package. The original issue: `require('electron')` was resolving to the npm package (which exports the binary path) instead of Electron's built-in API.

**Solution**: Electron Forge properly handles this with its webpack configuration and is the official recommended tooling for Electron apps.

## License

MIT

---

**Ready to build an amazing MQTT visualization tool!** 🚀