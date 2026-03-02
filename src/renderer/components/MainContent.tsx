import { useState, useEffect } from 'react';
import { Layout, Card, Space, Typography, Row, Col, Tabs } from 'antd';
import {
  RocketOutlined,
  DashboardOutlined,
  BarChartOutlined,
  LineChartOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ConnectionStatus } from '@shared/types/models';
import { api } from '../api/transport';
import { TopicTreeViewer } from './TopicTreeViewer';
import { SubscriptionManager } from './SubscriptionManager';
import { MessageList } from './MessageList';
import { MessagePublisher } from './MessagePublisher';
import { Statistics } from './Statistics';
import { ChartsTab } from './ChartsTab';
import { MessageReplay } from './MessageReplay';
import { RetentionPolicy } from './RetentionPolicy';

const { Content } = Layout;
const { Text } = Typography;

interface MainContentProps {
  connectionStatus: ConnectionStatus;
  token: any;
}

export const MainContent: React.FC<MainContentProps> = ({
  connectionStatus,
  token,
}) => {
  const [currentConnectionId, setCurrentConnectionId] = useState<string | null>(null);

  useEffect(() => {
    const removeListener = api.events.onConnectionChanged((connectionId: string | null) => {
      console.log('MainContent: Connection changed to:', connectionId);
      setCurrentConnectionId(connectionId);
    });

    // Query current connection on mount
    api.connections.getCurrentId()
      .then((id) => setCurrentConnectionId(id))
      .catch(console.error);

    return () => removeListener();
  }, []);

  return (
    <Content style={{ padding: '1px', background: token.colorBgLayout }}>
      <Row gutter={[16, 16]}>
        {connectionStatus === 'connected' && (
          <Col span={24}>
            <Tabs
              defaultActiveKey="dashboard"
              type="card"
              size="large"
              items={[
                {
                  key: 'dashboard',
                  label: (
                    <span>
                      <DashboardOutlined />
                      Dashboard
                    </span>
                  ),
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col span={10}>
                        <Row gutter={[16, 16]}>
                          <Col span={24}>
                            <TopicTreeViewer />
                          </Col>
                          <Col span={24}>
                            <SubscriptionManager />
                          </Col>
                        </Row>
                      </Col>
                      <Col span={14}>
                        <Row gutter={[16, 16]}>
                          <Col span={24}>
                            <MessageList maxMessages={200} />
                          </Col>
                          <Col span={24}>
                            <MessagePublisher />
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: 'analytics',
                  label: (
                    <span>
                      <BarChartOutlined />
                      Analytics
                    </span>
                  ),
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <Statistics />
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: 'charts',
                  label: (
                    <span>
                      <LineChartOutlined />
                      Charts
                    </span>
                  ),
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <ChartsTab />
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: 'tools',
                  label: (
                    <span>
                      <ToolOutlined />
                      Tools
                    </span>
                  ),
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <MessageReplay />
                      </Col>
                      <Col span={24}>
                        <RetentionPolicy />
                      </Col>
                    </Row>
                  ),
                },
              ]}
            />
          </Col>
        )}
      </Row>
    </Content>
  );
};
