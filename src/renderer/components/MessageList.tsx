import { useState, useEffect, useCallback } from 'react';
import {
  List,
  Card,
  Badge,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Empty,
  Tooltip,
  Drawer,
} from 'antd';
import {
  MessageOutlined,
  SearchOutlined,
  ClearOutlined,
  ExportOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { MqttMessage } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';
import { MessageDetail } from './MessageDetail';
import { format } from 'date-fns';

const { Search } = Input;
const { Option } = Select;

interface MessageListProps {
  maxMessages?: number;
}

export const MessageList: React.FC<MessageListProps> = ({ maxMessages = 100 }) => {
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<MqttMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MqttMessage | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [qosFilter, setQosFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    // Listen for incoming MQTT messages
    const removeListener = window.electronAPI.on(
      IPC_CHANNELS.MQTT_MESSAGE,
      (message: MqttMessage) => {
        setMessages((prev) => {
          const newMessages = [message, ...prev];
          // Limit to maxMessages
          return newMessages.slice(0, maxMessages);
        });
      }
    );

    return () => {
      removeListener();
    };
  }, [maxMessages]);

  useEffect(() => {
    // Filter messages based on search and QoS
    let filtered = messages;

    if (searchTerm) {
      filtered = filtered.filter((msg) => {
        const payload = msg.payload.toString().toLowerCase();
        const topic = msg.topic.toLowerCase();
        const search = searchTerm.toLowerCase();
        return topic.includes(search) || payload.includes(search);
      });
    }

    if (qosFilter !== 'all') {
      filtered = filtered.filter((msg) => msg.qos === qosFilter);
    }

    setFilteredMessages(filtered);
  }, [messages, searchTerm, qosFilter]);

  const handleClearMessages = () => {
    setMessages([]);
    setFilteredMessages([]);
  };

  const handleExportMessages = async () => {
    try {
      const data = JSON.stringify(filteredMessages, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mqtt-messages-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export messages:', error);
    }
  };

  const handleViewMessage = (message: MqttMessage) => {
    setSelectedMessage(message);
    setIsDetailVisible(true);
  };

  const formatPayload = (payload: Buffer | string, maxLength = 100): string => {
    const str = payload.toString();
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '...';
    }
    return str;
  };

  const getQoSColor = (qos: number): string => {
    switch (qos) {
      case 0:
        return 'default';
      case 1:
        return 'blue';
      case 2:
        return 'green';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Card
        title={
          <Space>
            <MessageOutlined />
            Messages
            <Badge count={filteredMessages.length} showZero style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Clear Messages">
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={handleClearMessages}
                disabled={messages.length === 0}
              />
            </Tooltip>
            <Tooltip title="Export Messages">
              <Button
                type="text"
                size="small"
                icon={<ExportOutlined />}
                onClick={handleExportMessages}
                disabled={filteredMessages.length === 0}
              />
            </Tooltip>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Filters */}
          <Space style={{ width: '100%' }}>
            <Search
              placeholder="Search topic or payload..."
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              value={qosFilter}
              onChange={setQosFilter}
              style={{ width: 120 }}
            >
              <Option value="all">All QoS</Option>
              <Option value={0}>QoS 0</Option>
              <Option value={1}>QoS 1</Option>
              <Option value={2}>QoS 2</Option>
            </Select>
          </Space>

          {/* Message List */}
          {filteredMessages.length === 0 ? (
            <Empty
              description={
                messages.length === 0
                  ? 'No messages received yet'
                  : 'No messages match your filters'
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '40px 0' }}
            />
          ) : (
            <List
              dataSource={filteredMessages}
              style={{ maxHeight: '500px', overflow: 'auto' }}
              renderItem={(message) => (
                <List.Item
                  key={message.id}
                  actions={[
                    <Tooltip title="View Details" key="view">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewMessage(message)}
                      />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{message.topic}</span>
                        <Tag color={getQoSColor(message.qos)}>QoS {message.qos}</Tag>
                        {message.retained && <Tag color="orange">Retained</Tag>}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          {format(new Date(message.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {formatPayload(message.payload)}
                        </span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Space>
      </Card>

      {/* Message Detail Drawer */}
      <Drawer
        title="Message Details"
        placement="right"
        width={600}
        onClose={() => setIsDetailVisible(false)}
        open={isDetailVisible}
      >
        {selectedMessage && <MessageDetail message={selectedMessage} />}
      </Drawer>
    </>
  );
};
