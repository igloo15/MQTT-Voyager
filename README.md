# MQTT Voyager

[![CI Build](https://github.com/igloo15/MQTT-Voyager/actions/workflows/ci.yml/badge.svg)](https://github.com/igloo15/MQTT-Voyager/actions/workflows/ci.yml)
[![Build and Release](https://github.com/igloo15/MQTT-Voyager/actions/workflows/build-release.yml/badge.svg)](https://github.com/igloo15/MQTT-Voyager/actions/workflows/build-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/igloo15/MQTT-Voyager/releases)

A powerful desktop application for visualizing, debugging, and managing MQTT messages. Built with Electron, React, and TypeScript for a modern, cross-platform experience.

## ✨ Features

### 🔌 Connection Management
- **Multiple Connection Profiles** - Save and manage unlimited MQTT broker connections
- **Protocol Support** - MQTT, MQTTS, WebSocket (WS), Secure WebSocket (WSS)
- **MQTT 5.0 Support** - User properties, enhanced authentication, and protocol features
- **Secure Connections** - TLS/SSL configuration with custom certificates
- **Auto-Reconnect** - Resilient connections with exponential backoff
- **Import/Export** - Share connection profiles across devices

### 📊 Message Visualization
- **Real-Time Stream** - Live message feed with auto-refresh
- **Topic Tree** - Hierarchical visualization of MQTT topics
- **Syntax Highlighting** - JSON, XML, and text payload formatting
- **Multiple Views** - Formatted, raw, and hex payload display
- **Message Details** - Comprehensive metadata (QoS, retained, timestamp, size)
- **Dark Mode** - Eye-friendly dark theme with system preference sync

### 🔍 Search & Filtering
- **Full-Text Search** - Fast SQLite FTS5-powered payload search
- **Topic Wildcards** - MQTT wildcard support (`+`, `#`)
- **Advanced Filters** - Filter by QoS, retained flag, time range, user properties
- **Filter Presets** - Save and load commonly used filter combinations
- **Database Pagination** - Efficient handling of large message volumes
- **Export** - Export filtered results to JSON or CSV

### 📝 Message Publishing
- **Interactive Publisher** - Easy-to-use message publishing interface
- **Payload Types** - Support for text and JSON payloads
- **JSON Validation** - Real-time JSON syntax validation and formatting
- **QoS Levels** - Select QoS 0, 1, or 2
- **User Properties** - Add custom MQTT 5.0 user properties
- **Retain Flag** - Publish retained messages
- **Sample Generator** - Generate sample payloads quickly

### 📈 Analytics & History
- **Message Statistics** - Real-time stats with message rates and data volume
- **Topic Distribution** - Visual breakdown of messages per topic
- **History Replay** - Replay historical messages at custom speeds
- **Retention Policies** - Automatic cleanup with configurable age and count limits
- **SQLite Storage** - Efficient message persistence with full-text indexing

### ⚡ Productivity
- **Keyboard Shortcuts** - Fast navigation and actions
  - `Ctrl/Cmd + D` - Toggle dark mode
  - `Ctrl/Cmd + N` - New connection
  - `Esc` - Close modals
- **Context Menus** - Right-click actions on topics and messages
- **Subscription Management** - Subscribe/unsubscribe with wildcard support
- **Clear Workflow** - Intuitive UI built on Ant Design

## 🚀 Quick Start

### Download
Download the latest release for your platform from the [Releases](https://github.com/igloo15/MQTT-Voyager/releases) page.

### Build from Source

#### Prerequisites
- Node.js 20+
- npm or yarn
- Git

#### Installation

```bash
# Clone the repository
git clone https://github.com/igloo15/MQTT-Voyager.git
cd MQTT-Voyager

# Install dependencies
npm install

# Start development server
npm start
```

#### Build for Production

```bash
# Build for your current platform
npm run make

# Output will be in the `out` folder
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Electron 32 + React 18 |
| **Language** | TypeScript |
| **Build Tool** | Electron Forge with Webpack |
| **UI Library** | Ant Design |
| **MQTT Client** | mqtt.js |
| **Database** | better-sqlite3 with FTS5 |
| **State** | React Hooks + Zustand |
| **Storage** | electron-store |

## 📁 Project Structure

```
MQTT-Voyager/
├── .github/
│   └── workflows/           # CI/CD workflows
├── shared/
│   └── types/              # Shared TypeScript types
│       ├── models.ts       # Data models
│       └── ipc.types.ts    # IPC contracts
├── src/
│   ├── index.ts            # Electron main process
│   ├── preload.ts          # IPC bridge
│   ├── renderer.tsx        # React entry point
│   ├── services/           # Backend services
│   │   ├── mqtt/           # MQTT service & topic tree
│   │   └── storage/        # Database & connection storage
│   └── renderer/
│       ├── App.tsx         # Main React component
│       └── components/     # React components
├── forge.config.ts         # Electron Forge config
├── webpack.*.config.ts     # Webpack configs
└── package.json
```

## 🔧 Development

### Running in Development Mode

```bash
npm start
```

This will:
- Build the Electron main process
- Build the preload script
- Start Webpack dev server with hot reload
- Launch the Electron app

### Type Checking

```bash
npm run lint
```

### Hot Reload
- **Renderer changes** - Auto-reload via Webpack HMR
- **Main/Preload changes** - Type `rs` in terminal to restart

### Adding New IPC Handlers

1. **Define channel** in `shared/types/ipc.types.ts`:
   ```typescript
   export const IPC_CHANNELS = {
     MY_CHANNEL: 'my:channel',
   } as const;
   ```

2. **Register handler** in `src/index.ts`:
   ```typescript
   ipcMain.handle(IPC_CHANNELS.MY_CHANNEL, async (_event, arg) => {
     return result;
   });
   ```

3. **Call from renderer**:
   ```typescript
   const result = await window.electronAPI.invoke(IPC_CHANNELS.MY_CHANNEL, arg);
   ```

## 🧪 Testing

Connect to a public MQTT broker for testing:
- **Broker**: `test.mosquitto.org`
- **Port**: `1883` (MQTT) or `8883` (MQTTS)
- **WebSocket**: `8080` (WS) or `8081` (WSS)

Or use the [Eclipse Mosquitto](https://test.mosquitto.org/) public broker.

## 📝 Changelog

See [Releases](https://github.com/igloo15/MQTT-Voyager/releases) for version history and changes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron Forge](https://www.electronforge.io/)
- UI powered by [Ant Design](https://ant.design/)
- MQTT client: [MQTT.js](https://github.com/mqttjs/MQTT.js)
- Database: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/igloo15/MQTT-Voyager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/igloo15/MQTT-Voyager/discussions)

---

**Made by igloo15**
