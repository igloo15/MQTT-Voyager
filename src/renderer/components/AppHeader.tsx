import { useState } from 'react';
import { Layout, Typography, Button, Space, Tag, Tooltip } from 'antd';
import {
  RocketOutlined,
  DisconnectOutlined,
  BulbOutlined,
  BulbFilled,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ConnectionStatus } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';
import { AboutModal } from './AboutModal';

const { Header } = Layout;
const { Title } = Typography;

interface AppHeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  connectionStatus: ConnectionStatus;
  messageCount: number;
  token: any;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isDarkMode,
  onToggleDarkMode,
  connectionStatus,
  messageCount,
  token,
}) => {
  const [isAboutModalVisible, setIsAboutModalVisible] = useState(false);

  const disconnectFromMQTT = async () => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_DISCONNECT);
    } catch (error) {
      console.error('Failed to disconnect:', error);
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
    <>
      <Header
        style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorder}`,
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
          <Tooltip title="About">
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={() => setIsAboutModalVisible(true)}
            />
          </Tooltip>
          <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <Button
              type="text"
              icon={isDarkMode ? <BulbFilled /> : <BulbOutlined />}
              onClick={onToggleDarkMode}
            />
          </Tooltip>
          <Tag color={getStatusColor()}>{connectionStatus.toUpperCase()}</Tag>
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
      <AboutModal
        visible={isAboutModalVisible}
        onClose={() => setIsAboutModalVisible(false)}
      />
    </>
  );
};
