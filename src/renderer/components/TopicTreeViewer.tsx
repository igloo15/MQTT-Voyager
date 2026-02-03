import { useState, useEffect } from 'react';
import {
  Tree,
  Input,
  Card,
  Badge,
  Dropdown,
  Space,
  Button,
  message as antMessage,
  Tooltip,
  Empty,
  Spin,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  MinusOutlined,
  ApiOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { IPC_CHANNELS } from '@shared/types/ipc.types';
import { formatDistanceToNow } from 'date-fns';

const { Search } = Input;

interface TopicNodeData {
  name: string;
  fullPath: string;
  messageCount: number;
  subscribed: boolean;
  lastMessage?: any;
  children: TopicNodeData[];
}

export const TopicTreeViewer: React.FC = () => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [quickSubscribeTopic, setQuickSubscribeTopic] = useState('');

  useEffect(() => {
    loadTopicTree();

    // Listen for topic tree updates
    const removeListener = window.electronAPI.on(IPC_CHANNELS.TOPIC_TREE_UPDATED, () => {
      loadTopicTree();
    });

    return () => {
      removeListener();
    };
  }, []);

  const loadTopicTree = async () => {
    try {
      const topicTree = await window.electronAPI.invoke(IPC_CHANNELS.TOPIC_TREE_GET);
      const converted = convertToTreeData(topicTree);
      setTreeData(converted);
    } catch (error) {
      console.error('Failed to load topic tree:', error);
    }
  };

  const convertToTreeData = (nodes: TopicNodeData[]): DataNode[] => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const hasMessages = node.messageCount > 0;

      // Format last message preview
      let lastMessagePreview = '';
      let lastMessageTime = '';
      if (node.lastMessage) {
        const payload =
          typeof node.lastMessage.payload === 'string'
            ? node.lastMessage.payload
            : node.lastMessage.payload.toString();
        lastMessagePreview = payload.length > 50 ? payload.substring(0, 50) + '...' : payload;

        // Format timestamp
        if (node.lastMessage.timestamp) {
          lastMessageTime = formatDistanceToNow(new Date(node.lastMessage.timestamp), { addSuffix: true });
        }
      }

      return {
        title: (
          <Dropdown
            menu={{
              items: getContextMenuItems(node),
              onClick: ({ key }) => handleMenuClick(key, node),
            }}
            trigger={['contextMenu']}
          >
            <div style={{ display: 'inline-block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: node.subscribed ? 'bold' : 'normal' }}>
                  {node.name}
                </span>
                {hasMessages && (
                  <Badge
                    count={node.messageCount}
                    style={{ backgroundColor: node.subscribed ? '#52c41a' : '#999' }}
                  />
                )}
                {node.subscribed && (
                  <Tooltip title="Subscribed">
                    <ApiOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                  </Tooltip>
                )}
              </div>
              {node.lastMessage && (
                <div style={{ marginTop: '2px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#999',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {lastMessagePreview}
                  </div>
                  {lastMessageTime && (
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#aaa',
                        marginTop: '1px',
                      }}
                    >
                      {lastMessageTime}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Dropdown>
        ),
        key: node.fullPath,
        icon: hasChildren
          ? (props: any) => (props.expanded ? <FolderOpenOutlined /> : <FolderOutlined />)
          : <FileTextOutlined />,
        children: hasChildren ? convertToTreeData(node.children) : undefined,
        isLeaf: !hasChildren,
      };
    });
  };

  const getContextMenuItems = (node: TopicNodeData): MenuProps['items'] => {
    const items: MenuProps['items'] = [];

    if (node.subscribed) {
      items.push({
        key: 'unsubscribe',
        label: 'Unsubscribe',
        icon: <MinusOutlined />,
      });
    } else {
      items.push({
        key: 'subscribe',
        label: 'Subscribe',
        icon: <PlusOutlined />,
      });
    }

    items.push(
      {
        key: 'subscribe-wildcard',
        label: 'Subscribe with Wildcard',
        icon: <PlusOutlined />,
        children: [
          {
            key: 'subscribe-single',
            label: `${node.fullPath}/+`,
          },
          {
            key: 'subscribe-multi',
            label: `${node.fullPath}/#`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        key: 'filter-messages',
        label: 'Filter Messages to Topic',
        icon: <FilterOutlined />,
      },
      {
        key: 'copy-topic',
        label: 'Copy Topic Path',
      }
    );

    if (node.lastMessage) {
      items.push({
        key: 'view-last-message',
        label: 'View Last Message',
      });
    }

    return items;
  };

  const handleMenuClick = async (key: string, node: TopicNodeData) => {
    try {
      switch (key) {
        case 'subscribe':
          await window.electronAPI.invoke(IPC_CHANNELS.MQTT_SUBSCRIBE, {
            topic: node.fullPath,
            qos: 0,
          });
          antMessage.success(`Subscribed to ${node.fullPath}`);
          await loadTopicTree();
          break;

        case 'unsubscribe':
          await window.electronAPI.invoke(IPC_CHANNELS.MQTT_UNSUBSCRIBE, node.fullPath);
          antMessage.success(`Unsubscribed from ${node.fullPath}`);
          await loadTopicTree();
          break;

        case 'subscribe-single':
          await window.electronAPI.invoke(IPC_CHANNELS.MQTT_SUBSCRIBE, {
            topic: `${node.fullPath}/+`,
            qos: 0,
          });
          antMessage.success(`Subscribed to ${node.fullPath}/+`);
          break;

        case 'subscribe-multi':
          await window.electronAPI.invoke(IPC_CHANNELS.MQTT_SUBSCRIBE, {
            topic: `${node.fullPath}/#`,
            qos: 0,
          });
          antMessage.success(`Subscribed to ${node.fullPath}/#`);
          break;

        case 'filter-messages':
          window.electronAPI.send(IPC_CHANNELS.MESSAGE_FILTER_TOPIC, node.fullPath);
          antMessage.success(`Filtering messages to topic: ${node.fullPath}`);
          break;

        case 'copy-topic':
          navigator.clipboard.writeText(node.fullPath);
          antMessage.success('Topic path copied to clipboard');
          break;

        case 'view-last-message':
          if (node.lastMessage) {
            const payload =
              typeof node.lastMessage.payload === 'string'
                ? node.lastMessage.payload
                : node.lastMessage.payload.toString();

            antMessage.info(
              <div>
                <strong>{node.fullPath}</strong>
                <pre style={{ marginTop: '8px', fontSize: '12px' }}>
                  {payload.length > 200 ? payload.substring(0, 200) + '...' : payload}
                </pre>
              </div>,
              5
            );
          }
          break;
      }
    } catch (error: any) {
      antMessage.error(`Failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);

    if (!value) {
      setExpandedKeys([]);
      setAutoExpandParent(false);
      return;
    }

    // Find all keys that match the search
    const keys: React.Key[] = [];
    const findMatchingKeys = (nodes: TopicNodeData[], parentKeys: string[] = []) => {
      nodes.forEach((node) => {
        const currentPath = [...parentKeys, node.fullPath];

        if (node.name.toLowerCase().includes(value.toLowerCase())) {
          // Add this key and all parent keys
          keys.push(...currentPath);
        }

        if (node.children && node.children.length > 0) {
          findMatchingKeys(node.children, currentPath);
        }
      });
    };

    window.electronAPI.invoke(IPC_CHANNELS.TOPIC_TREE_GET).then((topicTree) => {
      findMatchingKeys(topicTree);
      setExpandedKeys([...new Set(keys)]);
      setAutoExpandParent(true);
    });
  };

  const handleExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const handleExpandAll = () => {
    const getAllKeys = (nodes: DataNode[]): React.Key[] => {
      let keys: React.Key[] = [];
      nodes.forEach((node) => {
        keys.push(node.key);
        if (node.children) {
          keys = keys.concat(getAllKeys(node.children));
        }
      });
      return keys;
    };

    setExpandedKeys(getAllKeys(treeData));
  };

  const handleCollapseAll = () => {
    setExpandedKeys([]);
  };

  const handleQuickSubscribe = async () => {
    if (!quickSubscribeTopic.trim()) {
      antMessage.warning('Please enter a topic');
      return;
    }

    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_SUBSCRIBE, {
        topic: quickSubscribeTopic,
        qos: 0,
      });
      antMessage.success(`Subscribed to ${quickSubscribeTopic}`);
      setQuickSubscribeTopic('');
      await loadTopicTree();
    } catch (error: any) {
      antMessage.error(`Failed to subscribe: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <Card
      title={
        <Space>
          <FolderOutlined />
          Topic Tree
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Expand All">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleExpandAll}
            />
          </Tooltip>
          <Tooltip title="Collapse All">
            <Button
              type="text"
              size="small"
              icon={<MinusOutlined />}
              onClick={handleCollapseAll}
            />
          </Tooltip>
          <Tooltip title="Refresh">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={loadTopicTree}
              loading={loading}
            />
          </Tooltip>
        </Space>
      }
      styles={{ body: { padding: '12px' } }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Quick Subscribe */}
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Topic to subscribe (e.g., sensors/#)"
            prefix={<ApiOutlined />}
            value={quickSubscribeTopic}
            onChange={(e) => setQuickSubscribeTopic(e.target.value)}
            onPressEnter={handleQuickSubscribe}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleQuickSubscribe}>
            Subscribe
          </Button>
        </Space.Compact>

        {/* Search Topics */}
        <Search
          placeholder="Search topics..."
          prefix={<SearchOutlined />}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
        />

        {treeData.length === 0 ? (
          <Empty
            description="No topics yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '40px 0' }}
          >
            <p style={{ color: '#999', fontSize: '12px' }}>
              Subscribe to topics to see them appear here
            </p>
          </Empty>
        ) : (
          <div style={{ maxHeight: '600px', overflow: 'auto' }}>
            <Tree
              showIcon
              treeData={treeData}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onExpand={handleExpand}
              style={{ background: 'transparent' }}
            />
          </div>
        )}
      </Space>
    </Card>
  );
};
