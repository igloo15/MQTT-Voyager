import { Layout, Typography, Button, Space } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { IPC_CHANNELS } from '@shared/types/ipc.types';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function App() {
  const [ipcResponse, setIpcResponse] = useState<string>('');

  const testIPC = async () => {
    try {
      // Test IPC communication with type-safe channel
      const response = await window.electronAPI.invoke(IPC_CHANNELS.PING, 'Hello from React!');
      setIpcResponse(response);
    } catch (error) {
      setIpcResponse('IPC Error: ' + (error as Error).message);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#fff',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <RocketOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
        <Title level={3} style={{ margin: 0 }}>
          MQTT Voyager
        </Title>
      </Header>

      <Content style={{ padding: '48px', background: '#f0f2f5' }}>
        <div style={{
          background: '#fff',
          padding: '48px',
          borderRadius: '8px',
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <RocketOutlined style={{ fontSize: '64px', color: '#1890ff' }} />

            <Title level={2}>Welcome to MQTT Voyager</Title>

            <Text type="secondary" style={{ fontSize: '16px' }}>
              Your MQTT visualization and debugging companion
            </Text>

            <Space direction="vertical" size="middle">
              <Button type="primary" size="large" onClick={testIPC}>
                Test IPC Communication
              </Button>

              {ipcResponse && (
                <Text strong style={{ color: '#52c41a' }}>
                  {ipcResponse}
                </Text>
              )}
            </Space>

            <div style={{ marginTop: '32px' }}>
              <Text type="secondary">
                Phase 1: Foundation Complete ✓
              </Text>
            </div>
          </Space>
        </div>
      </Content>
    </Layout>
  );
}

export default App;
