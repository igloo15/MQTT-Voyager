import { useState } from 'react';
import {
  Form,
  Input,
  Select,
  Switch,
  Button,
  Card,
  Space,
  message as antMessage,
  Tabs,
} from 'antd';
import { SendOutlined, ClearOutlined } from '@ant-design/icons';
import { IPC_CHANNELS } from '@shared/types/ipc.types';
import type { QoS } from '@shared/types/models';

const { TextArea } = Input;
const { Option } = Select;

export const MessagePublisher: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [payloadType, setPayloadType] = useState<'text' | 'json'>('text');

  const handlePublish = async (values: any) => {
    setLoading(true);

    try {
      let payload = values.payload;

      // Validate and format JSON if needed
      if (payloadType === 'json') {
        try {
          // Validate JSON
          JSON.parse(payload);
        } catch (error) {
          antMessage.error('Invalid JSON payload');
          setLoading(false);
          return;
        }
      }

      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_PUBLISH, {
        topic: values.topic,
        payload,
        options: {
          qos: values.qos,
          retain: values.retain,
        },
      });

      antMessage.success(`Message published to ${values.topic}`);

      // Optionally clear payload after publishing
      if (values.clearAfterPublish) {
        form.setFieldValue('payload', '');
      }
    } catch (error: any) {
      antMessage.error(`Failed to publish: ${error.message || 'Unknown error'}`);
      console.error('Publish error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatJSON = () => {
    const payload = form.getFieldValue('payload');
    try {
      const formatted = JSON.stringify(JSON.parse(payload), null, 2);
      form.setFieldValue('payload', formatted);
      antMessage.success('JSON formatted');
    } catch (error) {
      antMessage.error('Invalid JSON');
    }
  };

  const handleClear = () => {
    form.resetFields();
  };

  const generateSamplePayload = () => {
    const samples = {
      text: 'Hello from MQTT Voyager!',
      json: JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          message: 'Hello from MQTT Voyager!',
          value: 42,
          status: 'online',
        },
        null,
        2
      ),
    };

    form.setFieldValue('payload', samples[payloadType]);
  };

  return (
    <Card
      title={
        <Space>
          <SendOutlined />
          Publish Message
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<ClearOutlined />}
          onClick={handleClear}
        >
          Clear
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handlePublish}
        initialValues={{
          topic: '',
          payload: '',
          qos: 0,
          retain: false,
          clearAfterPublish: false,
        }}
      >
        <Form.Item
          label="Topic"
          name="topic"
          rules={[{ required: true, message: 'Please enter a topic' }]}
        >
          <Input placeholder="sensors/temperature" />
        </Form.Item>

        <Form.Item label="Payload Type">
          <Space>
            <Select
              value={payloadType}
              onChange={setPayloadType}
              style={{ width: 120 }}
            >
              <Option value="text">Text</Option>
              <Option value="json">JSON</Option>
            </Select>
            {payloadType === 'json' && (
              <Button size="small" onClick={handleFormatJSON}>
                Format JSON
              </Button>
            )}
            <Button size="small" onClick={generateSamplePayload}>
              Generate Sample
            </Button>
          </Space>
        </Form.Item>

        <Form.Item
          label="Payload"
          name="payload"
          rules={[{ required: true, message: 'Please enter a payload' }]}
        >
          <TextArea
            rows={8}
            placeholder={
              payloadType === 'json'
                ? '{\n  "key": "value"\n}'
                : 'Enter your message here...'
            }
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Form.Item label="QoS" name="qos" style={{ marginBottom: 0 }}>
              <Select style={{ width: 100 }}>
                <Option value={0}>0</Option>
                <Option value={1}>1</Option>
                <Option value={2}>2</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Retain"
              name="retain"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="Clear After Publish"
              name="clearAfterPublish"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>
          </Space>
        </Space>

        <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={loading}
            block
          >
            Publish Message
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
