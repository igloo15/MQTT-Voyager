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
} from 'antd';
import {
  ApiOutlined,
  SaveOutlined,
  LockOutlined,
  SettingOutlined,
  SafetyOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  BellOutlined,
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
      // Ensure defaultSubscriptions is always an array
      const formValues = {
        ...connection,
        defaultSubscriptions: connection.defaultSubscriptions || [],
      };

      // Reset form first to clear any previous state, especially for Form.List
      form.resetFields();

      // Then set the new values
      form.setFieldsValue(formValues);
      setProtocol(connection.protocol);
    } else {
      // If no connection (new form), reset to defaults
      form.resetFields();
    }
  }, [connection, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);

    try {
      const config: ConnectionConfig = {
        ...values,
        id: connection?.id,
      };

      // Remove empty will and tls objects before saving
      if (config.will && !config.will.topic) {
        delete config.will;
      }
      if (config.tls && !config.tls.ca && !config.tls.cert && !config.tls.key) {
        delete config.tls;
      }

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
      await performConnect(values);
    } catch (error: any) {
      if (error.errorFields) {
        message.error('Please fill in all required fields');
      } else {
        console.error('Connection validation error:', error);
      }
    }
  };

  const performConnect = async (values: any) => {
    setLoading(true);
    try {
      const config: ConnectionConfig = {
        ...values,
        id: connection?.id,
      };

      // Remove empty will and tls objects
      if (config.will && !config.will.topic) {
        delete config.will;
      }
      if (config.tls && !config.tls.ca && !config.tls.cert && !config.tls.key) {
        delete config.tls;
      }

      // Connect to the broker (main process handles disconnecting existing connection)
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_CONNECT, config);
      message.success(`Connected to ${values.host}`);

      // Call onConnect callback AFTER successful connection
      if (onConnect) {
        onConnect(config);
      }
    } catch (error: any) {
      message.error(`Connection failed: ${error.message || 'Unknown error'}`);
      console.error('Connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields();
      await performTestConnection(values);
    } catch (error: any) {
      if (error.errorFields) {
        message.error('Please fill in all required fields');
      } else {
        console.error('Test connection validation error:', error);
      }
    }
  };

  const performTestConnection = async (values: any) => {
    setLoading(true);
    try {
      const config: ConnectionConfig = {
        ...values,
        connectTimeout: 5000, // Short timeout for testing
      };

      // Remove empty will and tls objects
      if (config.will && !config.will.topic) {
        delete config.will;
      }
      if (config.tls && !config.tls.ca && !config.tls.cert && !config.tls.key) {
        delete config.tls;
      }

      // Connect for testing
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_CONNECT, config);
      message.success('Connection test successful!');

      // Wait a moment to ensure connection is established
      await new Promise((resolve) => setTimeout(resolve, 500));

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
      key={connection?.id || 'new'}
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
        defaultSubscriptions: [],
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
        <Panel header={<><LockOutlined /> Authentication</>} key="auth" forceRender={true}>
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
        <Panel header={<><SettingOutlined /> Advanced Settings</>} key="advanced" forceRender={true}>
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

          <Form.Item
            label="MQTT Protocol Version"
            name="protocolVersion"
            tooltip="MQTT 5.0 supports user properties and other advanced features"
            initialValue={5}
          >
            <Select>
              <Option value={5}>5.0 (Recommended)</Option>
              <Option value={4}>3.1.1</Option>
              <Option value={3}>3.1</Option>
            </Select>
          </Form.Item>
        </Panel>

        {/* Last Will and Testament */}
        <Panel header="Last Will and Testament" key="will" forceRender={true}>
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

        {/* Default Subscriptions */}
        <Panel header={<><BellOutlined /> Default Subscriptions</>} key="subscriptions" forceRender={true}>
          <Form.List name="defaultSubscriptions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'topic']}
                      rules={[{ required: true, message: 'Topic required' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Input placeholder="sensors/#" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'qos']}
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <Select style={{ width: 80 }}>
                        <Option value={0}>QoS 0</Option>
                        <Option value={1}>QoS 1</Option>
                        <Option value={2}>QoS 2</Option>
                      </Select>
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Subscription
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Panel>

        {/* TLS/SSL Settings */}
        {(protocol === 'mqtts' || protocol === 'wss') && (
          <Panel header={<><SafetyOutlined /> TLS/SSL Settings</>} key="tls" forceRender={true}>
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
