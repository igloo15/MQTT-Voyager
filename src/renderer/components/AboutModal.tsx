import React from 'react';
import { Modal, Typography, Space, Divider, Tag } from 'antd';
import {
  RocketOutlined,
  GithubOutlined,
  CopyrightOutlined,
  CodeOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph, Link } = Typography;

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ visible, onClose }) => {
  const appInfo = {
    name: 'MQTT Voyager',
    version: '0.6.0',
    description: 'An advanced MQTT client for managing and monitoring MQTT topics and messages with ease.',
    author: 'igloo15',
    license: 'MIT',
    year: '2026',
    electronVersion: window.electronAPI.versions.electron,
    chromeVersion: window.electronAPI.versions.chrome,
    nodeVersion: window.electronAPI.versions.node,
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* App Header */}
        <div style={{ textAlign: 'center', paddingTop: '16px' }}>
          <RocketOutlined style={{ fontSize: '64px', color: '#1890ff' }} />
          <Title level={2} style={{ marginTop: '16px', marginBottom: '8px' }}>
            {appInfo.name}
          </Title>
          <Tag color="blue">v{appInfo.version}</Tag>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Description */}
        <Paragraph style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
          {appInfo.description}
        </Paragraph>

        <Divider style={{ margin: '8px 0' }} />

        {/* Details */}
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space>
            <CodeOutlined />
            <Text strong>Author:</Text>
            <Text>{appInfo.author}</Text>
          </Space>

          <Space>
            <CopyrightOutlined />
            <Text strong>License:</Text>
            <Text>{appInfo.license}</Text>
          </Space>

          <Space>
            <CalendarOutlined />
            <Text strong>Copyright:</Text>
            <Text>{appInfo.year} {appInfo.author}</Text>
          </Space>

          <Space>
            <GithubOutlined />
            <Text strong>Repository:</Text>
            <Link
              href="https://github.com/igloo15/MQTT-Voyager"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </Link>
          </Space>
        </Space>

        <Divider style={{ margin: '8px 0' }} />

        {/* Technical Info */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Technical Information:
          </Text>
          <Space direction="vertical" size="small" style={{ fontSize: '12px', color: '#888' }}>
            <Text type="secondary">Electron: {appInfo.electronVersion}</Text>
            <Text type="secondary">Chrome: {appInfo.chromeVersion}</Text>
            <Text type="secondary">Node.js: {appInfo.nodeVersion}</Text>
          </Space>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Built with React, TypeScript, Electron, and Ant Design
          </Text>
        </div>
      </Space>
    </Modal>
  );
};
