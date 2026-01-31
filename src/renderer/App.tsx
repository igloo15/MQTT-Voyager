import { Layout, Typography, Button, Space, Card, Input, message, Tag } from 'antd';
import { RocketOutlined, ApiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { IPC_CHANNELS } from '@shared/types/ipc.types';
import type { ConnectionConfig, ConnectionStatus } from '@shared/types/models';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function App() {
  const [ipcResponse, setIpcResponse] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [testTopic, setTestTopic] = useState<string>('test/mqtt-voyager');
  const [messageCount, setMessageCount] = useState<number>(0);

  useEffect(() => {
    // Listen for connection status updates
    const removeStatusListener = window.electronAPI.on(IPC_CHANNELS.MQTT_STATUS, (status: ConnectionStatus) => {
      console.log('Status update:', status);
      setConnectionStatus(status);
    });

    // Listen for incoming messages
    const removeMessageListener = window.electronAPI.on(IPC_CHANNELS.MQTT_MESSAGE, (msg: any) => {
      console.log('Received message:', msg);
      setMessageCount((prev) => prev + 1);
      message.success(`Message received on ${msg.topic}`);
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

  const testIPC = async () => {
    try {
      const response = await window.electronAPI.invoke(IPC_CHANNELS.PING, 'Hello from React!');
      setIpcResponse(response);
      message.success('IPC communication working!');
    } catch (error) {
      setIpcResponse('IPC Error: ' + (error as Error).message);
      message.error('IPC communication failed!');
    }
  };

  const connectToMQTT = async () => {
    try {
      const config: ConnectionConfig = {
        id: 'test-connection',
        name: 'Test Broker',
        host: 'broker.hivemq.com',
        port: 1883,
        protocol: 'mqtt',
        clientId: `mqtt_voyager_${Math.random().toString(16).slice(2, 8)}`,
      };

      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_CONNECT, config);
      message.success('Connected to MQTT broker!');
    } catch (error) {
      message.error('Failed to connect: ' + (error as Error).message);
    }
  };

  const disconnectFromMQTT = async () => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_DISCONNECT);
      setMessageCount(0);
      message.info('Disconnected from MQTT broker');
    } catch (error) {
      message.error('Failed to disconnect: ' + (error as Error).message);
    }
  };

  const subscribeToTopic = async () => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_SUBSCRIBE, { topic: testTopic, qos: 0 });
      message.success(`Subscribed to ${testTopic}`);
    } catch (error) {
      message.error('Failed to subscribe: ' + (error as Error).message);
    }
  };

  const publishMessage = async () => {
    try {
      const payload = JSON.stringify({
        message: 'Hello from MQTT Voyager!',
        timestamp: new Date().toISOString(),
      });

      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_PUBLISH, {
        topic: testTopic,
        payload,
        options: { qos: 0, retain: false },
      });
      message.success(`Published to ${testTopic}`);
    } catch (error) {
      message.error('Failed to publish: ' + (error as Error).message);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
      case 'reconnecting':
        return 'processing';
      case 'error':
        return 'error';
      default:
        return 'default';
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
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Welcome Card */}
            <Card>
              <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                <RocketOutlined style={{ fontSize: '64px', color: '#1890ff' }} />
                <Title level={2}>Welcome to MQTT Voyager</Title>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  Your MQTT visualization and debugging companion
                </Text>
                <div>
                  <Tag color={getStatusColor()}>
                    Status: {connectionStatus.toUpperCase()}
                  </Tag>
                  {messageCount > 0 && (
                    <Tag color="blue">Messages: {messageCount}</Tag>
                  )}
                </div>
              </Space>
            </Card>

            {/* IPC Test Card */}
            <Card title="🔧 IPC Communication Test">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" onClick={testIPC}>
                  Test IPC Communication
                </Button>
                {ipcResponse && (
                  <Text strong style={{ color: '#52c41a' }}>
                    {ipcResponse}
                  </Text>
                )}
              </Space>
            </Card>

            {/* MQTT Connection Test Card */}
            <Card title="🌐 MQTT Connection Test (Phase 2)">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space>
                  <Button
                    type="primary"
                    icon={<ApiOutlined />}
                    onClick={connectToMQTT}
                    disabled={connectionStatus === 'connected' || connectionStatus === 'connecting'}
                  >
                    Connect to broker.hivemq.com
                  </Button>
                  <Button
                    danger
                    icon={<DisconnectOutlined />}
                    onClick={disconnectFromMQTT}
                    disabled={connectionStatus === 'disconnected'}
                  >
                    Disconnect
                  </Button>
                </Space>

                {connectionStatus === 'connected' && (
                  <>
                    <div>
                      <Text strong>Topic: </Text>
                      <Input
                        style={{ width: '300px' }}
                        value={testTopic}
                        onChange={(e) => setTestTopic(e.target.value)}
                        placeholder="Enter topic"
                      />
                    </div>

                    <Space>
                      <Button onClick={subscribeToTopic}>
                        Subscribe to Topic
                      </Button>
                      <Button type="primary" onClick={publishMessage}>
                        Publish Test Message
                      </Button>
                    </Space>
                  </>
                )}
              </Space>
            </Card>

            {/* Phase Progress */}
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">✅ Phase 1: Foundation Complete</Text>
                <Text type="secondary">✅ Phase 2: MQTT Core Service Complete</Text>
                <Text type="secondary" style={{ opacity: 0.5 }}>⏳ Phase 3: Connection Management (Next)</Text>
              </Space>
            </Card>
          </Space>
        </div>
      </Content>
    </Layout>
  );
}

export default App;
