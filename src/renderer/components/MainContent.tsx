import { Layout, Card, Space, Typography, Row, Col, Tabs } from 'antd';
import {
  RocketOutlined,
  DashboardOutlined,
  BarChartOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ConnectionStatus } from '@shared/types/models';
import { TopicTreeViewer } from './TopicTreeViewer';
import { MessageList } from './MessageList';
import { MessagePublisher } from './MessagePublisher';
import { Statistics } from './Statistics';
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
  return (
    <Content style={{ padding: '24px', background: token.colorBgLayout }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <RocketOutlined />
                Welcome to MQTT Voyager
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                Connect to your MQTT broker using the sidebar, or create a new connection
                profile to get started.
              </Text>
              <div>
                <Text type="secondary">✅ Phase 1: Foundation</Text>
                <br />
                <Text type="secondary">✅ Phase 2: MQTT Core Service</Text>
                <br />
                <Text type="secondary">✅ Phase 3: Connection Management</Text>
                <br />
                <Text type="secondary">✅ Phase 4: Topic Tree Visualization</Text>
                <br />
                <Text type="secondary">✅ Phase 5: Message Viewer & Publisher</Text>
                <br />
                <Text type="secondary">✅ Phase 6: Search & Filtering</Text>
                <br />
                <Text type="secondary">✅ Phase 7: Message History & Replay</Text>
                <br />
                <Text strong style={{ color: '#52c41a' }}>
                  ✅ Phase 8: Polish & Packaging 🎉
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

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
                        <TopicTreeViewer />
                      </Col>
                      <Col span={14}>
                        <Row gutter={[16, 16]}>
                          <Col span={24}>
                            <MessagePublisher />
                          </Col>
                          <Col span={24}>
                            <MessageList maxMessages={200} />
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
