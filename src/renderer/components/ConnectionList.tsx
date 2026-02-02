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
            <List.Item key={conn.id} style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', gap: '12px' }}>
                <ApiOutlined style={{ fontSize: '20px', color: '#1890ff', marginTop: '4px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: '4px' }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px', wordBreak: 'break-word' }}>
                      {conn.name}
                    </div>
                    <Space size="small" wrap>
                      <Tag color={getProtocolColor(conn.protocol)} icon={getProtocolIcon(conn.protocol)}>
                        {conn.protocol.toUpperCase()}
                      </Tag>
                      {conn.username && (
                        <Tag icon={<SafetyOutlined />} color="orange">
                          Auth
                        </Tag>
                      )}
                    </Space>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {`${conn.host}:${conn.port}`}
                  </div>
                  {conn.clientId && (
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      Client ID: {conn.clientId}
                    </div>
                  )}
                  <Space size="small" style={{ marginTop: '8px' }}>
                    <Tooltip title="Connect">
                      <Button
                        size="small"
                        type="primary"
                        icon={<LinkOutlined />}
                        onClick={() => handleConnect(conn.id!)}
                      >
                        Connect
                      </Button>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(conn.id!)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title={`Delete "${conn.name}"?`}
                      description="This action cannot be undone"
                      onConfirm={() => handleDelete(conn.id!, conn.name)}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Delete">
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};
