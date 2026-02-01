import {
  Layout,
  Typography,
  Button,
  Space,
  Card,
  Input,
  message,
  Tag,
  Tabs,
  Modal,
  Row,
  Col,
} from 'antd';
import {
  RocketOutlined,
  ApiOutlined,
  DisconnectOutlined,
  PlusOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { IPC_CHANNELS } from '@shared/types/ipc.types';
import type { ConnectionConfig, ConnectionStatus } from '@shared/types/models';
import { ConnectionForm } from './components/ConnectionForm';
import { ConnectionList } from './components/ConnectionList';
import { TopicTreeViewer } from './components/TopicTreeViewer';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

function App() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [testTopic, setTestTopic] = useState<string>('test/mqtt-voyager');
  const [messageCount, setMessageCount] = useState<number>(0);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionConfig | undefined>();
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_SUBSCRIBE, {
        topic: testTopic,
        qos: 0,
      });
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
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RocketOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <Title level={3} style={{ margin: 0 }}>
            MQTT Voyager
          </Title>
        </div>
        <Space>
          <Tag color={getStatusColor()}>
            {connectionStatus.toUpperCase()}
          </Tag>
          {messageCount > 0 && <Tag color="blue">Messages: {messageCount}</Tag>}
          {connectionStatus !== 'disconnected' && (
            <Button
              danger
              size="small"
              icon={<DisconnectOutlined />}
              onClick={disconnectFromMQTT}
            >
              Disconnect
            </Button>
          )}
        </Space>
      </Header>

      <Layout>
        <Sider width={350} style={{ background: '#fff', padding: '16px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleNewConnection}
              block
            >
              New Connection
            </Button>

            <ConnectionList
              refreshTrigger={refreshTrigger}
              onEdit={handleEditConnection}
              onConnect={handleConnect}
            />
          </Space>
        </Sider>

        <Layout>
          <Content style={{ padding: '24px', background: '#f0f2f5' }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card
                  title={
                    <Space>
                      <RocketOutlined />
                      Welcome to MQTT Voyager
                    </Space>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>
                      Connect to your MQTT broker using the sidebar, or create a new connection
                      profile to get started.
                    </Text>
                    <div>
                      <Text type="secondary">✅ Phase 1: Foundation</Text>
                      <br />
                      <Text type="secondary">✅ Phase 2: MQTT Core Service</Text>
                      <br />
                      <Text type="secondary">✅ Phase 3: Connection Management</Text>
                      <br />
                      <Text strong style={{ color: '#52c41a' }}>
                        ✅ Phase 4: Topic Tree Visualization
                      </Text>
                    </div>
                  </Space>
                </Card>
              </Col>

              {connectionStatus === 'connected' && (
                <>
                  <Col span={10}>
                    <TopicTreeViewer />
                  </Col>

                  <Col span={14}>
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <Card title={<><ApiOutlined /> Quick Test</>}>
                          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <div>
                              <Text strong>Topic: </Text>
                              <Input
                                style={{ width: '300px', marginLeft: '8px' }}
                                value={testTopic}
                                onChange={(e) => setTestTopic(e.target.value)}
                                placeholder="Enter topic"
                              />
                            </div>
                            <Space>
                              <Button onClick={subscribeToTopic}>Subscribe to Topic</Button>
                              <Button type="primary" onClick={publishMessage}>
                                Publish Test Message
                              </Button>
                            </Space>
                          </Space>
                        </Card>
                      </Col>

                      <Col span={24}>
                        <Card
                          title={
                            <Space>
                              <DatabaseOutlined />
                              Messages
                            </Space>
                          }
                        >
                          <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Text type="secondary">
                              {messageCount === 0
                                ? 'No messages received yet. Subscribe to a topic to start receiving messages.'
                                : `Received ${messageCount} message${messageCount === 1 ? '' : 's'}`}
                            </Text>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </Col>
                </>
              )}
            </Row>
          </Content>
        </Layout>
      </Layout>

      <Modal
        title={selectedConnection ? 'Edit Connection' : 'New Connection'}
        open={isFormModalVisible}
        onCancel={handleFormCancel}
        footer={null}
        width={700}
        destroyOnClose
      >
        <ConnectionForm
          connection={selectedConnection}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
          onConnect={handleConnect}
        />
      </Modal>
    </Layout>
  );
}

export default App;
