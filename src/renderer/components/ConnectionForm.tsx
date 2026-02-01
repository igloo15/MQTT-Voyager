import { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  Collapse,
  message,
  Modal,
} from 'antd';
import {
  ApiOutlined,
  SaveOutlined,
  LockOutlined,
  SettingOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import type { ConnectionConfig, QoS } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';

const { Panel } = Collapse;
const { TextArea } = Input;
const { Option } = Select;

interface ConnectionFormProps {
  connection?: ConnectionConfig;
  onSave?: (connection: ConnectionConfig) => void;
  onCancel?: () => void;
  onConnect?: (connection: ConnectionConfig) => void;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  connection,
  onSave,
  onCancel,
  onConnect,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [protocol, setProtocol] = useState<string>(connection?.protocol || 'mqtt');

  useEffect(() => {
    if (connection) {
      form.setFieldsValue(connection);
      setProtocol(connection.protocol);
    }
  }, [connection, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);

    try {
      const config: ConnectionConfig = {
        ...values,
        id: connection?.id,
      };

      // Save the connection profile
      const connectionId = await window.electronAPI.invoke(
        IPC_CHANNELS.CONNECTION_SAVE,
        config
      );

      message.success(`Connection profile "${values.name}" saved successfully`);

      if (onSave) {
        onSave({ ...config, id: connectionId });
      }

      form.resetFields();
    } catch (error) {
      message.error('Failed to save connection profile');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const config: ConnectionConfig = {
        ...values,
        id: connection?.id,
      };

      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_CONNECT, config);
      message.success(`Connected to ${values.host}`);

      if (onConnect) {
        onConnect(config);
      }
    } catch (error: any) {
      if (error.errorFields) {
        message.error('Please fill in all required fields');
      } else {
        message.error(`Connection failed: ${error.message || 'Unknown error'}`);
      }
      console.error('Connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const config: ConnectionConfig = {
        ...values,
        connectTimeout: 5000, // Short timeout for testing
      };

      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_CONNECT, config);
      message.success('Connection test successful!');

      // Disconnect after test
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_DISCONNECT);
    } catch (error: any) {
      message.error(`Connection test failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPort = (proto: string): number => {
    switch (proto) {
      case 'mqtt':
        return 1883;
      case 'mqtts':
        return 8883;
      case 'ws':
        return 8083;
      case 'wss':
        return 8084;
      default:
        return 1883;
    }
  };

  const handleProtocolChange = (value: string) => {
    setProtocol(value);
    // Auto-update port if it's the default for the old protocol
    const currentPort = form.getFieldValue('port');
    if (!currentPort || currentPort === getDefaultPort(protocol)) {
      form.setFieldValue('port', getDefaultPort(value));
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        protocol: 'mqtt',
        port: 1883,
        cleanSession: true,
        keepalive: 60,
        reconnectPeriod: 1000,
        connectTimeout: 30000,
      }}
    >
      {/* Basic Settings */}
      <Form.Item
        label="Connection Name"
        name="name"
        rules={[{ required: true, message: 'Please enter a connection name' }]}
      >
        <Input prefix={<ApiOutlined />} placeholder="My MQTT Broker" />
      </Form.Item>

      <Space style={{ width: '100%' }} size="middle">
        <Form.Item
          label="Protocol"
          name="protocol"
          rules={[{ required: true }]}
          style={{ minWidth: '120px' }}
        >
          <Select onChange={handleProtocolChange}>
            <Option value="mqtt">MQTT</Option>
            <Option value="mqtts">MQTTS</Option>
            <Option value="ws">WebSocket</Option>
            <Option value="wss">WSS</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Host"
          name="host"
          rules={[{ required: true, message: 'Please enter host' }]}
          style={{ flex: 1 }}
        >
          <Input placeholder="broker.hivemq.com" />
        </Form.Item>

        <Form.Item
          label="Port"
          name="port"
          rules={[{ required: true, message: 'Please enter port' }]}
          style={{ minWidth: '100px' }}
        >
          <InputNumber min={1} max={65535} style={{ width: '100%' }} />
        </Form.Item>
      </Space>

      {/* Authentication */}
      <Collapse ghost>
        <Panel header={<><LockOutlined /> Authentication</>} key="auth">
          <Form.Item label="Client ID" name="clientId">
            <Input placeholder="Leave empty for auto-generated" />
          </Form.Item>

          <Form.Item label="Username" name="username">
            <Input placeholder="username" />
          </Form.Item>

          <Form.Item label="Password" name="password">
            <Input.Password placeholder="password" />
          </Form.Item>
        </Panel>

        {/* Advanced Settings */}
        <Panel header={<><SettingOutlined /> Advanced Settings</>} key="advanced">
          <Form.Item label="Clean Session" name="cleanSession" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Keep Alive (seconds)" name="keepalive">
            <InputNumber min={0} max={3600} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Reconnect Period (ms)" name="reconnectPeriod">
            <InputNumber min={0} max={60000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Connect Timeout (ms)" name="connectTimeout">
            <InputNumber min={1000} max={120000} style={{ width: '100%' }} />
          </Form.Item>
        </Panel>

        {/* Last Will and Testament */}
        <Panel header="Last Will and Testament" key="will">
          <Form.Item label="Topic" name={['will', 'topic']}>
            <Input placeholder="will/topic" />
          </Form.Item>

          <Form.Item label="Payload" name={['will', 'payload']}>
            <TextArea rows={3} placeholder="offline" />
          </Form.Item>

          <Space style={{ width: '100%' }}>
            <Form.Item label="QoS" name={['will', 'qos']} initialValue={0}>
              <Select style={{ width: '80px' }}>
                <Option value={0}>0</Option>
                <Option value={1}>1</Option>
                <Option value={2}>2</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Retain"
              name={['will', 'retain']}
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>
          </Space>
        </Panel>

        {/* TLS/SSL Settings */}
        {(protocol === 'mqtts' || protocol === 'wss') && (
          <Panel header={<><SafetyOutlined /> TLS/SSL Settings</>} key="tls">
            <Form.Item
              label="Reject Unauthorized"
              name={['tls', 'rejectUnauthorized']}
              valuePropName="checked"
              initialValue={true}
              tooltip="Verify server certificate"
            >
              <Switch />
            </Form.Item>

            <Form.Item label="CA Certificate" name={['tls', 'ca']}>
              <TextArea rows={4} placeholder="-----BEGIN CERTIFICATE-----" />
            </Form.Item>

            <Form.Item label="Client Certificate" name={['tls', 'cert']}>
              <TextArea rows={4} placeholder="-----BEGIN CERTIFICATE-----" />
            </Form.Item>

            <Form.Item label="Client Key" name={['tls', 'key']}>
              <TextArea rows={4} placeholder="-----BEGIN PRIVATE KEY-----" />
            </Form.Item>
          </Panel>
        )}
      </Collapse>

      {/* Action Buttons */}
      <Form.Item style={{ marginTop: '24px' }}>
        <Space>
          <Button
            type="primary"
            icon={<ApiOutlined />}
            onClick={handleConnect}
            loading={loading}
          >
            Connect
          </Button>

          <Button
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={loading}
          >
            Save Profile
          </Button>

          <Button onClick={handleTestConnection} loading={loading}>
            Test Connection
          </Button>

          {onCancel && (
            <Button onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );
};
