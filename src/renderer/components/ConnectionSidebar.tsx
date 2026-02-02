import { Layout, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ConnectionList } from './ConnectionList';
import type { ConnectionConfig } from '@shared/types/models';

const { Sider } = Layout;

interface ConnectionSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  onNewConnection: () => void;
  onEditConnection: (connection: ConnectionConfig) => void;
  onConnect: () => void;
  refreshTrigger: number;
  token: any;
}

export const ConnectionSidebar: React.FC<ConnectionSidebarProps> = ({
  collapsed,
  onCollapse,
  onNewConnection,
  onEditConnection,
  onConnect,
  refreshTrigger,
  token,
}) => {
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={350}
      collapsedWidth={80}
      style={{ background: token.colorBgContainer }}
    >
      {!collapsed && (
        <div style={{ padding: '16px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onNewConnection}
              block
            >
              New Connection
            </Button>

            <ConnectionList
              refreshTrigger={refreshTrigger}
              onEdit={onEditConnection}
              onConnect={onConnect}
            />
          </Space>
        </div>
      )}
    </Sider>
  );
};
