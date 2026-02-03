import { useState } from 'react';
import { Descriptions, Tag, Button, Space, message as antMessage, Tabs, theme } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { MqttMessage } from '@shared/types/models';
import { format } from 'date-fns';

interface MessageDetailProps {
  message: MqttMessage;
}

export const MessageDetail: React.FC<MessageDetailProps> = ({ message }) => {
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState('formatted');

  const getPayloadString = (): string => {
    // Payloads are always strings in renderer (converted before IPC)
    return typeof message.payload === 'string' ? message.payload : String(message.payload);
  };

  const detectPayloadType = (): 'json' | 'xml' | 'text' | 'binary' => {
    const payload = getPayloadString();

    try {
      JSON.parse(payload);
      return 'json';
    } catch {}

    if (payload.trim().startsWith('<') && payload.trim().endsWith('>')) {
      return 'xml';
    }

    // Check if it's binary (contains non-printable characters)
    const hasNonPrintable = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(payload);
    if (hasNonPrintable) {
      return 'binary';
    }

    return 'text';
  };

  const formatPayload = (): string => {
    const payload = getPayloadString();
    const type = detectPayloadType();

    if (type === 'json') {
      try {
        return JSON.stringify(JSON.parse(payload), null, 2);
      } catch {
        return payload;
      }
    }

    return payload;
  };

  const stringToHex = (str: string): string => {
    const hex = [];
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      hex.push(charCode.toString(16).padStart(2, '0'));
    }
    return hex.join(' ');
  };

  const getPayloadAsHex = (): string => {
    const payload = getPayloadString();
    return stringToHex(payload);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    antMessage.success(`${label} copied to clipboard`);
  };

  const payloadType = detectPayloadType();
  const formattedPayload = formatPayload();

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Message Metadata */}
      <Descriptions title="Message Information" column={1} bordered size="small">
        <Descriptions.Item label="Topic">
          <Space>
            {message.topic}
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(message.topic, 'Topic')}
            />
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="QoS">
          <Tag color={message.qos === 0 ? 'default' : message.qos === 1 ? 'blue' : 'green'}>
            QoS {message.qos}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Retained">
          <Tag color={message.retained ? 'orange' : 'default'}>
            {message.retained ? 'Yes' : 'No'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Timestamp">
          {format(new Date(message.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
        </Descriptions.Item>
        <Descriptions.Item label="Message ID">
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{message.id}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Payload Type">
          <Tag>{payloadType.toUpperCase()}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Payload Size">
          {new TextEncoder().encode(getPayloadString()).length} bytes
        </Descriptions.Item>
        {message.userProperties && Object.keys(message.userProperties).length > 0 && (
          <Descriptions.Item label="User Properties">
            <div style={{
              background: token.colorBgContainer,
              padding: '8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              border: `1px solid ${token.colorBorder}`
            }}>
              {Object.entries(message.userProperties).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '4px' }}>
                  <strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value}
                </div>
              ))}
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Payload Views */}
      <div>
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <strong>Payload</strong>
          <Space>
            {message.userProperties && Object.keys(message.userProperties).length > 0 && (
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(JSON.stringify(message.userProperties, null, 2), 'User Properties')}
              >
                Copy User Properties
              </Button>
            )}
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(formattedPayload, 'Payload')}
            >
              Copy Payload
            </Button>
          </Space>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'formatted',
              label: 'Formatted',
              children: (
                <SyntaxHighlighter
                  language={payloadType === 'json' ? 'json' : payloadType === 'xml' ? 'xml' : 'text'}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                  showLineNumbers
                  wrapLines
                >
                  {formattedPayload}
                </SyntaxHighlighter>
              ),
            },
            {
              key: 'raw',
              label: 'Raw',
              children: (
                <div
                  style={{
                    background: '#1e1e1e',
                    color: '#d4d4d4',
                    padding: '16px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: '400px',
                    overflow: 'auto',
                  }}
                >
                  {getPayloadString()}
                </div>
              ),
            },
            {
              key: 'hex',
              label: 'Hex',
              children: (
                <div
                  style={{
                    background: '#1e1e1e',
                    color: '#d4d4d4',
                    padding: '16px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: '400px',
                    overflow: 'auto',
                  }}
                >
                  {getPayloadAsHex()}
                </div>
              ),
            },
          ]}
        />
      </div>
    </Space>
  );
};
