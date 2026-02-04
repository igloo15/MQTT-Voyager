import { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Collapse,
  Badge,
  Tag,
  message as antMessage,
} from 'antd';
import {
  PlusOutlined,
  CloseOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { Subscription } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';

export const SubscriptionManager: React.FC = () => {
  const [quickSubscribeTopic, setQuickSubscribeTopic] = useState('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    loadSubscriptions();

    // Listen for connection changes
    const removeConnectionListener = window.electronAPI.on(
      IPC_CHANNELS.CONNECTION_CHANGED,
      (connectionId: string | null) => {
        console.log('Connection changed, clearing subscriptions:', connectionId);
        setSubscriptions([]);
        if (connectionId) {
          loadSubscriptions();
        }
      }
    );

    return () => {
      removeConnectionListener();
    };
  }, []);

  const loadSubscriptions = async () => {
    try {
      const subs = await window.electronAPI.invoke(IPC_CHANNELS.MQTT_GET_SUBSCRIPTIONS);
      setSubscriptions(subs);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const handleQuickSubscribe = async () => {
    if (!quickSubscribeTopic.trim()) {
      antMessage.warning('Please enter a topic to subscribe');
      return;
    }

    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_SUBSCRIBE, {
        topic: quickSubscribeTopic,
        qos: 0,
      });
      antMessage.success(`Subscribed to ${quickSubscribeTopic}`);
      setQuickSubscribeTopic('');
      await loadSubscriptions();
    } catch (error: any) {
      antMessage.error(`Failed to subscribe: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUnsubscribe = async (topic: string) => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_UNSUBSCRIBE, topic);
      antMessage.success(`Unsubscribed from ${topic}`);
      await loadSubscriptions();
    } catch (error: any) {
      antMessage.error(`Failed to unsubscribe: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <Card
      title={
        <Space>
          <ApiOutlined />
          Subscriptions
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Quick Subscribe */}
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Enter topic (e.g., sensors/#)"
            value={quickSubscribeTopic}
            onChange={(e) => setQuickSubscribeTopic(e.target.value)}
            onPressEnter={handleQuickSubscribe}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleQuickSubscribe}>
            Subscribe
          </Button>
        </Space.Compact>

        {/* Active Subscriptions */}
        {subscriptions.length > 0 && (
          <Collapse
            size="small"
            items={[
              {
                key: 'subscriptions',
                label: (
                  <Space>
                    <span>Active Subscriptions</span>
                    <Badge count={subscriptions.length} style={{ backgroundColor: '#52c41a' }} />
                  </Space>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {subscriptions.map((sub) => (
                      <div
                        key={sub.topic}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 8px',
                          background: 'rgba(82, 196, 26, 0.1)',
                          borderRadius: '4px',
                        }}
                      >
                        <Space>
                          <Tag color="green">QoS {sub.qos}</Tag>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {sub.topic}
                          </span>
                        </Space>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => handleUnsubscribe(sub.topic)}
                        />
                      </div>
                    ))}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Space>
    </Card>
  );
};
