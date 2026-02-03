import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Progress,
  Space,
  Button,
  Tooltip,
  Empty,
  Modal,
  message as antMessage,
} from 'antd';
import {
  BarChartOutlined,
  MessageOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  FolderOutlined,
  ReloadOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { Statistics as StatsType } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';

export const Statistics: React.FC = () => {
  const [stats, setStats] = useState<StatsType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const statistics = await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_GET_STATS);
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetStatistics = () => {
    Modal.confirm({
      title: 'Reset Analytics',
      content: 'Are you sure you want to reset all analytics? This action cannot be undone.',
      okText: 'Reset',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_RESET_STATS);
          antMessage.success('Analytics reset successfully');
          loadStatistics();
        } catch (error: any) {
          antMessage.error(`Failed to reset analytics: ${error.message}`);
          console.error('Failed to reset statistics:', error);
        }
      },
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getTopicDistribution = () => {
    if (!stats || !stats.messagesByTopic) return [];

    const topics = Object.entries(stats.messagesByTopic);
    const maxCount = Math.max(...topics.map(([_, count]) => count));

    return topics.map(([topic, count]) => ({
      topic,
      count,
      percentage: (count / stats.totalMessages) * 100,
      barPercentage: (count / maxCount) * 100,
    }));
  };

  if (!stats) {
    return (
      <Card loading={loading}>
        <Empty description="No statistics available" />
      </Card>
    );
  }

  const topicDistribution = getTopicDistribution();

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Overview Statistics */}
      <Card
        title={
          <Space>
            <BarChartOutlined />
            Statistics Overview
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Reset Analytics">
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={handleResetStatistics}
                danger
              />
            </Tooltip>
            <Tooltip title="Refresh Statistics">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={loadStatistics}
                loading={loading}
              />
            </Tooltip>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Messages"
              value={stats.totalMessages}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Unique Topics"
              value={stats.topicCount}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Messages/Sec"
              value={stats.messagesPerSecond.toFixed(2)}
              prefix={<ThunderboltOutlined />}
              suffix="msg/s"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Data Volume"
              value={formatBytes(stats.dataVolume)}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Topic Distribution */}
      {topicDistribution.length > 0 && (
        <Card
          title={
            <Space>
              <FolderOutlined />
              Topic Distribution (Top 10)
            </Space>
          }
        >
          <List
            dataSource={topicDistribution}
            renderItem={(item) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          maxWidth: '60%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.topic}
                      </span>
                      <Space>
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          {item.percentage.toFixed(1)}%
                        </span>
                        <span style={{ fontWeight: 'bold' }}>{item.count}</span>
                      </Space>
                    </div>
                    <Progress
                      percent={item.barPercentage}
                      showInfo={false}
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                    />
                  </Space>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Activity Summary */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            Activity Summary
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Recent Activity (Last Minute)</strong>
            <p style={{ margin: '8px 0', color: '#666' }}>
              {stats.messagesPerSecond > 0
                ? `Receiving approximately ${stats.messagesPerSecond.toFixed(
                    2
                  )} messages per second`
                : 'No recent message activity'}
            </p>
          </div>

          <div>
            <strong>Storage Usage</strong>
            <p style={{ margin: '8px 0', color: '#666' }}>
              {stats.totalMessages} messages consuming {formatBytes(stats.dataVolume)}
              {stats.totalMessages > 0 &&
                ` (avg ${formatBytes(stats.dataVolume / stats.totalMessages)} per message)`}
            </p>
          </div>

          <div>
            <strong>Topic Coverage</strong>
            <p style={{ margin: '8px 0', color: '#666' }}>
              Messages spread across {stats.topicCount} unique topic
              {stats.topicCount !== 1 ? 's' : ''}
              {stats.totalMessages > 0 &&
                ` (avg ${(stats.totalMessages / stats.topicCount).toFixed(
                  1
                )} messages per topic)`}
            </p>
          </div>
        </Space>
      </Card>
    </Space>
  );
};
