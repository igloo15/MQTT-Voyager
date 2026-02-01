import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Select,
  Button,
  Space,
  Switch,
  Divider,
  message as antMessage,
  Alert,
  Statistic,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import {
  DeleteOutlined,
  SaveOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { IPC_CHANNELS } from '@shared/types/ipc.types';

const { Option } = Select;

interface RetentionSettings {
  enabled: boolean;
  maxMessages: number;
  maxAgeDays: number;
}

export const RetentionPolicy: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('retentionSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved) as RetentionSettings;
        form.setFieldsValue(settings);
      } catch (error) {
        console.error('Failed to load retention settings:', error);
      }
    }
  };

  const loadStats = async () => {
    try {
      const stats = await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_GET_STATS);
      if (stats) {
        setTotalMessages(stats.totalMessages);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSave = async (values: RetentionSettings) => {
    try {
      localStorage.setItem('retentionSettings', JSON.stringify(values));
      antMessage.success('Retention policy saved');

      // Apply retention policy immediately if enabled
      if (values.enabled) {
        await applyRetentionPolicy(values);
      }
    } catch (error: any) {
      antMessage.error(`Failed to save: ${error.message}`);
    }
  };

  const applyRetentionPolicy = async (settings: RetentionSettings) => {
    setLoading(true);
    try {
      let cleaned = 0;

      // Clean by age
      if (settings.maxAgeDays > 0) {
        const cutoffTime = Date.now() - settings.maxAgeDays * 24 * 60 * 60 * 1000;
        // Note: This would require a new IPC handler to clear messages older than timestamp
        // For now, we'll just clear all if total exceeds max
      }

      // Clean by count (keep only the most recent maxMessages)
      const stats = await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_GET_STATS);
      if (stats && stats.totalMessages > settings.maxMessages) {
        cleaned = stats.totalMessages - settings.maxMessages;
        antMessage.info(`Retention policy would clean ${cleaned} messages (not implemented yet)`);
      }

      await loadStats();
    } catch (error: any) {
      antMessage.error(`Failed to apply policy: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearOldMessages = async (days: number) => {
    setLoading(true);
    try {
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
      // This would require a new IPC handler
      antMessage.info(`Clear messages older than ${days} days (not implemented yet)`);
      await loadStats();
    } catch (error: any) {
      antMessage.error(`Failed to clear: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    setLoading(true);
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_CLEAR);
      antMessage.success('All messages cleared');
      await loadStats();
    } catch (error: any) {
      antMessage.error(`Failed to clear: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <DatabaseOutlined />
          Retention Policy
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          message="Message Retention"
          description="Configure automatic cleanup of old messages to prevent database growth. Settings are saved locally and applied when enabled."
          type="info"
          showIcon
        />

        {/* Current Stats */}
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="Total Messages"
              value={totalMessages}
              prefix={<DatabaseOutlined />}
            />
          </Col>
        </Row>

        <Divider />

        {/* Retention Settings Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            enabled: false,
            maxMessages: 10000,
            maxAgeDays: 7,
          }}
        >
          <Form.Item label="Enable Automatic Retention" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            label="Maximum Messages"
            name="maxMessages"
            help="Automatically delete oldest messages when this limit is exceeded"
          >
            <InputNumber
              min={100}
              max={1000000}
              step={1000}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item
            label="Maximum Age (Days)"
            name="maxAgeDays"
            help="Automatically delete messages older than this many days"
          >
            <InputNumber min={1} max={365} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Save Policy
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        {/* Manual Cleanup */}
        <div>
          <h4>
            <ClockCircleOutlined /> Manual Cleanup
          </h4>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap>
              <Popconfirm
                title="Clear messages older than 1 day?"
                onConfirm={() => handleClearOldMessages(1)}
                okText="Yes"
                cancelText="No"
              >
                <Button loading={loading}>Clear &gt; 1 day</Button>
              </Popconfirm>

              <Popconfirm
                title="Clear messages older than 7 days?"
                onConfirm={() => handleClearOldMessages(7)}
                okText="Yes"
                cancelText="No"
              >
                <Button loading={loading}>Clear &gt; 7 days</Button>
              </Popconfirm>

              <Popconfirm
                title="Clear messages older than 30 days?"
                onConfirm={() => handleClearOldMessages(30)}
                okText="Yes"
                cancelText="No"
              >
                <Button loading={loading}>Clear &gt; 30 days</Button>
              </Popconfirm>
            </Space>

            <Popconfirm
              title="Are you sure you want to delete ALL messages? This cannot be undone."
              onConfirm={handleClearAll}
              okText="Yes, delete all"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} loading={loading}>
                Clear All Messages
              </Button>
            </Popconfirm>
          </Space>
        </div>
      </Space>
    </Card>
  );
};
