import { useState, useEffect } from 'react';
import {
  List,
  Card,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Empty,
  Tooltip,
} from 'antd';
import {
  ApiOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import type { ConnectionConfig } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';

interface ConnectionListProps {
  onEdit?: (connection: ConnectionConfig) => void;
  onConnect?: (connection: ConnectionConfig) => void;
  refreshTrigger?: number;
}

export const ConnectionList: React.FC<ConnectionListProps> = ({
  onEdit,
  onConnect,
  refreshTrigger,
}) => {
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConnections();
  }, [refreshTrigger]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const profiles = await window.electronAPI.invoke(IPC_CHANNELS.CONNECTION_LIST);
      setConnections(profiles);
    } catch (error) {
      message.error('Failed to load connection profiles');
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.CONNECTION_DELETE, id);
      message.success(`Deleted connection "${name}"`);
      loadConnections();
    } catch (error) {
      message.error('Failed to delete connection');
      console.error('Delete error:', error);
    }
  };

  const handleConnect = async (connectionId: string) => {
    try {
      // Get full connection details (including password)
      const connection = await window.electronAPI.invoke(
        IPC_CHANNELS.CONNECTION_GET,
        connectionId
      );

      if (!connection) {
        message.error('Connection profile not found');
        return;
      }

      if (onConnect) {
        onConnect(connection);
      }

      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_CONNECT, connection);
      message.success(`Connected to ${connection.name}`);
    } catch (error: any) {
      message.error(`Failed to connect: ${error.message || 'Unknown error'}`);
      console.error('Connect error:', error);
    }
  };

  const handleEdit = async (connectionId: string) => {
    try {
      // Get full connection details (including password)
      const connection = await window.electronAPI.invoke(
        IPC_CHANNELS.CONNECTION_GET,
        connectionId
      );

      if (!connection) {
        message.error('Connection profile not found');
        return;
      }

      if (onEdit) {
        onEdit(connection);
      }
    } catch (error) {
      message.error('Failed to load connection details');
      console.error('Edit error:', error);
    }
  };

  const getProtocolColor = (protocol: string): string => {
    switch (protocol) {
      case 'mqtt':
        return 'blue';
      case 'mqtts':
        return 'green';
      case 'ws':
        return 'orange';
      case 'wss':
        return 'purple';
      default:
        return 'default';
    }
  };

  const getProtocolIcon = (protocol: string) => {
    if (protocol === 'mqtts' || protocol === 'wss') {
      return <SafetyOutlined />;
    }
    return null;
  };

  return (
    <Card
      title={
        <Space>
          <ApiOutlined />
          Saved Connections
        </Space>
      }
      extra={
        <Button type="link" onClick={loadConnections} loading={loading}>
          Refresh
        </Button>
      }
    >
      {connections.length === 0 ? (
        <Empty
          description="No saved connections"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          loading={loading}
          dataSource={connections}
          renderItem={(conn) => (
            <List.Item
              key={conn.id}
              actions={[
                <Tooltip title="Connect" key="connect">
                  <Button
                    type="text"
                    icon={<LinkOutlined />}
                    onClick={() => handleConnect(conn.id!)}
                  />
                </Tooltip>,
                <Tooltip title="Edit" key="edit">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(conn.id!)}
                  />
                </Tooltip>,
                <Popconfirm
                  key="delete"
                  title={`Delete "${conn.name}"?`}
                  description="This action cannot be undone"
                  onConfirm={() => handleDelete(conn.id!, conn.name)}
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Delete">
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<ApiOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                title={
                  <Space>
                    {conn.name}
                    <Tag color={getProtocolColor(conn.protocol)} icon={getProtocolIcon(conn.protocol)}>
                      {conn.protocol.toUpperCase()}
                    </Tag>
                    {conn.username && (
                      <Tag icon={<SafetyOutlined />} color="orange">
                        Auth
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <span>{`${conn.host}:${conn.port}`}</span>
                    {conn.clientId && (
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        Client ID: {conn.clientId}
                      </span>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};
