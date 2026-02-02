import { Layout, message, ConfigProvider, theme as antdTheme } from 'antd';
import { useState, useEffect } from 'react';
import { theme as antdThemeHook } from 'antd';
import { IPC_CHANNELS } from '@shared/types/ipc.types';
import type { ConnectionConfig, ConnectionStatus } from '@shared/types/models';
import { AppHeader } from './components/AppHeader';
import { ConnectionSidebar } from './components/ConnectionSidebar';
import { MainContent } from './components/MainContent';
import { ConnectionModal } from './components/ConnectionModal';

const { Content } = Layout;

interface AppContentProps {
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

function AppContent({ isDarkMode, setIsDarkMode }: AppContentProps) {
  const { token } = antdThemeHook.useToken();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [messageCount, setMessageCount] = useState<number>(0);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionConfig | undefined>();
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd + D: Toggle dark mode
      if (modifier && event.key === 'd') {
        event.preventDefault();
        setIsDarkMode((prev: boolean) => !prev);
        message.success(`${isDarkMode ? 'Light' : 'Dark'} mode enabled`);
      }

      // Ctrl/Cmd + N: New connection
      if (modifier && event.key === 'n') {
        event.preventDefault();
        handleNewConnection();
      }

      // Escape: Close modal
      if (event.key === 'Escape' && isFormModalVisible) {
        handleFormCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDarkMode, isFormModalVisible]);

  useEffect(() => {
    // Listen for connection status updates
    const removeStatusListener = window.electronAPI.on(
      IPC_CHANNELS.MQTT_STATUS,
      (status: ConnectionStatus) => {
        console.log('Status update:', status);
        setConnectionStatus(status);
      }
    );

    // Listen for incoming messages
    const removeMessageListener = window.electronAPI.on(IPC_CHANNELS.MQTT_MESSAGE, (msg: any) => {
      console.log('Received message:', msg);
      setMessageCount((prev) => prev + 1);
    });

    // Listen for errors
    const removeErrorListener = window.electronAPI.on(IPC_CHANNELS.MQTT_ERROR, (error: string) => {
      console.error('MQTT Error:', error);
      message.error(`MQTT Error: ${error}`);
    });

    return () => {
      removeStatusListener();
      removeMessageListener();
      removeErrorListener();
    };
  }, []);

  const handleNewConnection = () => {
    setSelectedConnection(undefined);
    setIsFormModalVisible(true);
  };

  const handleEditConnection = (connection: ConnectionConfig) => {
    setSelectedConnection(connection);
    setIsFormModalVisible(true);
  };

  const handleFormSave = () => {
    setIsFormModalVisible(false);
    setSelectedConnection(undefined);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleFormCancel = () => {
    setIsFormModalVisible(false);
    setSelectedConnection(undefined);
  };

  const handleConnect = () => {
    setIsFormModalVisible(false);
    setSelectedConnection(undefined);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        connectionStatus={connectionStatus}
        messageCount={messageCount}
        token={token}
      />

      <Layout>
        <ConnectionSidebar
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          onNewConnection={handleNewConnection}
          onEditConnection={handleEditConnection}
          onConnect={handleConnect}
          refreshTrigger={refreshTrigger}
          token={token}
        />

        <Content style={{ padding: '24px', background: token.colorBgLayout }}>
          <MainContent connectionStatus={connectionStatus} token={token} />
        </Content>
      </Layout>

      <ConnectionModal
        visible={isFormModalVisible}
        connection={selectedConnection}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
        onConnect={handleConnect}
      />
    </Layout>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      <AppContent isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
    </ConfigProvider>
  );
}

export default App;
