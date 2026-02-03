import { useState, useEffect, useCallback } from 'react';
import {
  List,
  Card,
  Badge,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Empty,
  Tooltip,
  Drawer,
  Collapse,
  Row,
  Col,
  DatePicker,
  Checkbox,
  Divider,
  message as antMessage,
  Dropdown,
  Modal,
} from 'antd';
import {
  MessageOutlined,
  SearchOutlined,
  ClearOutlined,
  ExportOutlined,
  ReloadOutlined,
  EyeOutlined,
  FilterOutlined,
  SaveOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { MqttMessage, MessageFilter } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';
import { MessageDetail } from './MessageDetail';
import { format } from 'date-fns';
import dayjs, { Dayjs } from 'dayjs';
import type { MenuProps } from 'antd';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { TextArea } = Input;

interface MessageListProps {
  maxMessages?: number;
}

interface FilterPreset {
  name: string;
  filter: MessageFilter;
}

export const MessageList: React.FC<MessageListProps> = ({ maxMessages = 200 }) => {
  // Database messages (replaces in-memory buffer)
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [selectedMessage, setSelectedMessage] = useState<MqttMessage | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  // Filter state
  const [topicFilter, setTopicFilter] = useState('');
  const [payloadSearch, setPayloadSearch] = useState('');
  const [qosFilter, setQosFilter] = useState<number | undefined>(undefined);
  const [retainedFilter, setRetainedFilter] = useState<boolean | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [filterLimit, setFilterLimit] = useState(200);
  const [userPropertyKey, setUserPropertyKey] = useState('');
  const [userPropertyValue, setUserPropertyValue] = useState('');

  // Filter presets
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [isPresetModalVisible, setIsPresetModalVisible] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Check if filters are active
  const hasActiveFilters =
    topicFilter || payloadSearch || qosFilter !== undefined || retainedFilter !== undefined || dateRange || userPropertyKey || userPropertyValue;

  // Build filter function
  const buildFilter = useCallback((): MessageFilter => {
    const filter: MessageFilter = {
      limit: filterLimit,
    };

    if (topicFilter) {
      filter.topic = topicFilter;
    }

    if (payloadSearch) {
      filter.payloadSearch = payloadSearch;
    }

    if (qosFilter !== undefined) {
      filter.qos = qosFilter as 0 | 1 | 2;
    }

    if (retainedFilter !== undefined) {
      filter.retained = retainedFilter;
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      filter.startTime = dateRange[0].valueOf();
      filter.endTime = dateRange[1].valueOf();
    }

    if (userPropertyKey) {
      filter.userPropertyKey = userPropertyKey;
    }

    if (userPropertyValue) {
      filter.userPropertyValue = userPropertyValue;
    }

    return filter;
  }, [topicFilter, payloadSearch, qosFilter, retainedFilter, dateRange, filterLimit, userPropertyKey, userPropertyValue]);

  // Load messages from database
  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const filter = buildFilter();
      const results = await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_SEARCH, filter);
      setMessages(results);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      antMessage.error(`Failed to load messages: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [buildFilter]);

  // Initial load and load on filter changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Listen for new messages and refresh if auto-refresh is enabled
  useEffect(() => {
    const removeListener = window.electronAPI.on(
      IPC_CHANNELS.MQTT_MESSAGE,
      (message: MqttMessage) => {
        // Reload messages from database when new message arrives
        if (autoRefresh) {
          loadMessages();
        }
      }
    );

    return () => {
      removeListener();
    };
  }, [autoRefresh, loadMessages]);

  // Listen for connection changes and reload messages
  useEffect(() => {
    const removeListener = window.electronAPI.on(
      IPC_CHANNELS.CONNECTION_CHANGED,
      (connectionId: string | null) => {
        console.log('Connection changed, reloading messages for new connection:', connectionId);
        // Clear and reload messages
        setMessages([]);
        loadMessages();
      }
    );

    return () => removeListener();
  }, [loadMessages]);

  // Listen for filter topic events from TopicTreeViewer
  useEffect(() => {
    const removeListener = window.electronAPI.on(
      IPC_CHANNELS.MESSAGE_FILTER_TOPIC,
      (topic: string) => {
        setTopicFilter(topic);
      }
    );

    return () => {
      removeListener();
    };
  }, []);

  // Load filter presets from localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem('messageFilterPresets');
    if (savedPresets) {
      try {
        setFilterPresets(JSON.parse(savedPresets));
      } catch (error) {
        console.error('Failed to load filter presets:', error);
      }
    }
  }, []);

  // Save filter presets to localStorage
  useEffect(() => {
    if (filterPresets.length > 0) {
      localStorage.setItem('messageFilterPresets', JSON.stringify(filterPresets));
    }
  }, [filterPresets]);

  const handleSearch = async () => {
    await loadMessages();
    antMessage.success(`Found ${messages.length} messages`);
  };

  const handleClearFilter = () => {
    setTopicFilter('');
    setPayloadSearch('');
    setQosFilter(undefined);
    setRetainedFilter(undefined);
    setDateRange(null);
    setFilterLimit(200);
    setUserPropertyKey('');
    setUserPropertyValue('');
    // Messages will automatically reload via useEffect
  };

  const handleClearAllMessages = async () => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_CLEAR);
      setMessages([]);
      antMessage.success('All messages cleared');
    } catch (error: any) {
      antMessage.error(`Failed to clear messages: ${error.message}`);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const filter = buildFilter();
      const data = await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_EXPORT, {
        filter,
        format,
      });

      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mqtt-messages-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      antMessage.success(`Exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      antMessage.error(`Export failed: ${error.message}`);
      console.error('Export error:', error);
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      antMessage.error('Please enter a preset name');
      return;
    }

    const filter = buildFilter();
    const newPreset: FilterPreset = {
      name: presetName,
      filter,
    };

    setFilterPresets((prev) => [...prev, newPreset]);
    setPresetName('');
    setIsPresetModalVisible(false);
    antMessage.success('Filter preset saved');
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    const filter = preset.filter;

    setTopicFilter(filter.topic || '');
    setPayloadSearch(filter.payloadSearch || '');
    setQosFilter(filter.qos);
    setRetainedFilter(filter.retained);
    setFilterLimit(filter.limit || 200);
    setUserPropertyKey(filter.userPropertyKey || '');
    setUserPropertyValue(filter.userPropertyValue || '');

    if (filter.startTime && filter.endTime) {
      setDateRange([dayjs(filter.startTime), dayjs(filter.endTime)]);
    } else {
      setDateRange(null);
    }

    antMessage.success(`Loaded preset: ${preset.name}`);
  };

  const handleDeletePreset = (index: number) => {
    setFilterPresets((prev) => prev.filter((_, i) => i !== index));
    antMessage.success('Preset deleted');
  };

  const handleViewMessage = (message: MqttMessage) => {
    setSelectedMessage(message);
    setIsDetailVisible(true);
  };

  const formatPayload = (payload: Buffer | string, maxLength = 80): string => {
    const str = payload.toString();
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '...';
    }
    return str;
  };

  const getQoSColor = (qos: number): string => {
    switch (qos) {
      case 0:
        return 'default';
      case 1:
        return 'blue';
      case 2:
        return 'green';
      default:
        return 'default';
    }
  };

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'json',
      label: 'Export as JSON',
      onClick: () => handleExport('json'),
    },
    {
      key: 'csv',
      label: 'Export as CSV',
      onClick: () => handleExport('csv'),
    },
  ];

  return (
    <>
      <Card
        title={
          <Space>
            <MessageOutlined />
            Messages
            <Badge count={messages.length} showZero style={{ backgroundColor: '#52c41a' }} />
            {hasActiveFilters && <Badge status="processing" text="Filtered" />}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}>
              <Checkbox
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              >
                Auto-refresh
              </Checkbox>
            </Tooltip>
            <Tooltip title="Refresh Messages">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                loading={isLoading}
                onClick={loadMessages}
              />
            </Tooltip>
            <Tooltip title="Clear All Messages">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleClearAllMessages}
              />
            </Tooltip>
            <Dropdown menu={{ items: exportMenuItems }}>
              <Tooltip title="Export Messages">
                <Button type="text" size="small" icon={<ExportOutlined />} />
              </Tooltip>
            </Dropdown>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Advanced Filters */}
          <Collapse
            bordered={false}
            defaultActiveKey={[]}
            expandIcon={({ isActive }) => <FilterOutlined rotate={isActive ? 90 : 0} />}
          >
            <Panel
              header={
                <Space>
                  <span>Advanced Filters</span>
                  {hasActiveFilters && <Badge status="processing" text="Active" />}
                </Space>
              }
              key="filters"
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <label>Topic Filter (supports MQTT wildcards +, #)</label>
                    <Input
                      placeholder="sensors/+/temperature"
                      value={topicFilter}
                      onChange={(e) => setTopicFilter(e.target.value)}
                      prefix={<SearchOutlined />}
                    />
                  </Col>
                  <Col span={12}>
                    <label>Payload Search (full-text)</label>
                    <Input
                      placeholder="Search in payload..."
                      value={payloadSearch}
                      onChange={(e) => setPayloadSearch(e.target.value)}
                      prefix={<SearchOutlined />}
                    />
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <label>User Property Key</label>
                    <Input
                      placeholder="property-name"
                      value={userPropertyKey}
                      onChange={(e) => setUserPropertyKey(e.target.value)}
                      prefix={<SearchOutlined />}
                    />
                  </Col>
                  <Col span={12}>
                    <label>User Property Value</label>
                    <Input
                      placeholder="property-value"
                      value={userPropertyValue}
                      onChange={(e) => setUserPropertyValue(e.target.value)}
                      prefix={<SearchOutlined />}
                    />
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <label>QoS Level</label>
                    <Select
                      value={qosFilter}
                      onChange={setQosFilter}
                      style={{ width: '100%' }}
                      allowClear
                      placeholder="All QoS"
                    >
                      <Option value={0}>QoS 0</Option>
                      <Option value={1}>QoS 1</Option>
                      <Option value={2}>QoS 2</Option>
                    </Select>
                  </Col>
                  <Col span={8}>
                    <label>Retained</label>
                    <Select
                      value={retainedFilter}
                      onChange={setRetainedFilter}
                      style={{ width: '100%' }}
                      allowClear
                      placeholder="All"
                    >
                      <Option value={true}>Retained Only</Option>
                      <Option value={false}>Non-Retained Only</Option>
                    </Select>
                  </Col>
                  <Col span={8}>
                    <label>Result Limit</label>
                    <Select
                      value={filterLimit}
                      onChange={setFilterLimit}
                      style={{ width: '100%' }}
                    >
                      <Option value={50}>50 messages</Option>
                      <Option value={100}>100 messages</Option>
                      <Option value={200}>200 messages</Option>
                      <Option value={500}>500 messages</Option>
                      <Option value={1000}>1000 messages</Option>
                    </Select>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <label>Time Range</label>
                    <RangePicker
                      showTime
                      value={dateRange}
                      onChange={(dates) => setDateRange(dates)}
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD HH:mm:ss"
                    />
                  </Col>
                </Row>

                <Divider />

                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                    Search Database
                  </Button>
                  <Button icon={<ClearOutlined />} onClick={handleClearFilter}>
                    Clear Filters
                  </Button>
                  <Button icon={<SaveOutlined />} onClick={() => setIsPresetModalVisible(true)}>
                    Save as Preset
                  </Button>
                </Space>

                {/* Filter Presets */}
                {filterPresets.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <strong>Saved Presets:</strong>
                      <Space wrap style={{ marginTop: 8 }}>
                        {filterPresets.map((preset, index) => (
                          <Tag
                            key={index}
                            closable
                            onClose={() => handleDeletePreset(index)}
                            onClick={() => handleLoadPreset(preset)}
                            style={{ cursor: 'pointer' }}
                          >
                            {preset.name}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  </>
                )}
              </Space>
            </Panel>
          </Collapse>

          {/* Message List */}
          {messages.length === 0 ? (
            <Empty
              description={
                hasActiveFilters
                  ? 'No messages match your filter criteria'
                  : 'No messages received yet'
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '40px 0' }}
            />
          ) : (
            <List
              dataSource={messages}
              loading={isLoading}
              style={{ maxHeight: '400px', overflow: 'auto' }}
              renderItem={(message) => (
                <List.Item
                  key={message.id}
                  actions={[
                    <Tooltip title="View Details" key="view">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewMessage(message)}
                      />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{message.topic}</span>
                        <Tag color={getQoSColor(message.qos)}>QoS {message.qos}</Tag>
                        {message.retained && <Tag color="orange">Retained</Tag>}
                        {message.userProperties && Object.keys(message.userProperties).length > 0 && (
                          <Tag color="purple">
                            {Object.keys(message.userProperties).length} {Object.keys(message.userProperties).length === 1 ? 'property' : 'properties'}
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          {format(new Date(message.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {formatPayload(message.payload)}
                        </span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Space>
      </Card>

      {/* Message Detail Drawer */}
      <Drawer
        title="Message Details"
        placement="right"
        width={700}
        onClose={() => setIsDetailVisible(false)}
        open={isDetailVisible}
      >
        {selectedMessage && <MessageDetail message={selectedMessage} />}
      </Drawer>

      {/* Save Preset Modal */}
      <Modal
        title="Save Filter Preset"
        open={isPresetModalVisible}
        onOk={handleSavePreset}
        onCancel={() => {
          setIsPresetModalVisible(false);
          setPresetName('');
        }}
      >
        <Input
          placeholder="Enter preset name"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          onPressEnter={handleSavePreset}
        />
      </Modal>
    </>
  );
};
