import { useState, useEffect } from 'react';
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
  // Real-time messages (from live stream)
  const [liveMessages, setLiveMessages] = useState<MqttMessage[]>([]);

  // Database search results
  const [searchResults, setSearchResults] = useState<MqttMessage[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [selectedMessage, setSelectedMessage] = useState<MqttMessage | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  // Filter state
  const [topicFilter, setTopicFilter] = useState('');
  const [payloadSearch, setPayloadSearch] = useState('');
  const [qosFilter, setQosFilter] = useState<number | undefined>(undefined);
  const [retainedFilter, setRetainedFilter] = useState<boolean | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [filterLimit, setFilterLimit] = useState(200);

  // Filter presets
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [isPresetModalVisible, setIsPresetModalVisible] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Helper function to convert MQTT topic pattern to regex
  const mqttPatternToRegex = (pattern: string): RegExp => {
    // Check if pattern contains MQTT wildcards
    const hasMqttWildcards = pattern.includes('+') || pattern.includes('#');

    if (hasMqttWildcards) {
      // Escape regex special characters except + and #
      let regexPattern = pattern.replace(/[.?*()[\]{}\\^$|]/g, '\\$&');

      // Convert MQTT wildcards to regex
      // + matches exactly one level (anything except /)
      regexPattern = regexPattern.replace(/\+/g, '[^/]+');

      // # matches zero or more levels (must be at end)
      // sensors/# should match "sensors", "sensors/temp", "sensors/temp/room1"
      if (regexPattern.endsWith('/#')) {
        regexPattern = regexPattern.slice(0, -2) + '(/.*)?';
      } else {
        regexPattern = regexPattern.replace(/#/g, '.*');
      }

      // Anchor to match full topic
      return new RegExp('^' + regexPattern + '$');
    } else {
      // No wildcards - treat as literal topic name and escape regex special chars
      // This handles topics with $ (like $SYS system topics) correctly
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Do prefix match: "sensors" matches "sensors", "sensors/temp", etc.
      return new RegExp('^' + escaped + '(/.*)?$');
    }
  };

  // Helper function to check if a message matches current filters
  const matchesFilters = (message: MqttMessage): boolean => {
    // Topic filter (supports MQTT wildcards and regex)
    if (topicFilter) {
      const regex = mqttPatternToRegex(topicFilter);
      if (!regex.test(message.topic)) {
        return false;
      }
    }

    // Payload search
    if (payloadSearch) {
      const payload = typeof message.payload === 'string'
        ? message.payload
        : message.payload.toString();
      if (!payload.toLowerCase().includes(payloadSearch.toLowerCase())) {
        return false;
      }
    }

    // QoS filter
    if (qosFilter !== undefined && message.qos !== qosFilter) {
      return false;
    }

    // Retained filter
    if (retainedFilter !== undefined && message.retained !== retainedFilter) {
      return false;
    }

    // Date range filter (for live messages, check against current time)
    if (dateRange && dateRange[0] && dateRange[1]) {
      const messageTime = message.timestamp;
      if (messageTime < dateRange[0].valueOf() || messageTime > dateRange[1].valueOf()) {
        return false;
      }
    }

    return true;
  };

  // Live message stream
  useEffect(() => {
    const removeListener = window.electronAPI.on(
      IPC_CHANNELS.MQTT_MESSAGE,
      (message: MqttMessage) => {
        setLiveMessages((prev) => {
          const newMessages = [message, ...prev];
          return newMessages.slice(0, maxMessages);
        });
      }
    );

    return () => {
      removeListener();
    };
  }, [maxMessages]);

  // Listen for connection changes and clear messages
  useEffect(() => {
    const removeListener = window.electronAPI.on(
      IPC_CHANNELS.CONNECTION_CHANGED,
      (connectionId: string | null) => {
        console.log('Connection changed, clearing messages for new connection:', connectionId);
        // Clear local message state
        setLiveMessages([]);
        setSearchResults([]);
        setIsSearchMode(false);
      }
    );

    return () => removeListener();
  }, []);

  // Listen for filter topic events from TopicTreeViewer
  useEffect(() => {
    const removeListener = window.electronAPI.on(
      IPC_CHANNELS.MESSAGE_FILTER_TOPIC,
      (topic: string) => {
        setTopicFilter(topic);
        setIsSearchMode(false);
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

  const buildFilter = (): MessageFilter => {
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

    return filter;
  };

  const handleSearch = async () => {
    try {
      const filter = buildFilter();
      const results = await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_SEARCH, filter);
      setSearchResults(results);
      setIsSearchMode(true);
      antMessage.success(`Found ${results.length} messages`);
    } catch (error: any) {
      antMessage.error(`Search failed: ${error.message}`);
      console.error('Search error:', error);
    }
  };

  const handleClearFilter = () => {
    setTopicFilter('');
    setPayloadSearch('');
    setQosFilter(undefined);
    setRetainedFilter(undefined);
    setDateRange(null);
    setFilterLimit(200);
    setIsSearchMode(false);
    setSearchResults([]);
  };

  const handleClearAllMessages = async () => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_CLEAR);
      setLiveMessages([]);
      setSearchResults([]);
      setIsSearchMode(false);
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

  // Display messages (either live or search results)
  const displayMessages = isSearchMode ? searchResults : liveMessages.filter(matchesFilters);
  const hasActiveFilters =
    topicFilter || payloadSearch || qosFilter !== undefined || retainedFilter !== undefined || dateRange;

  return (
    <>
      <Card
        title={
          <Space>
            <MessageOutlined />
            {isSearchMode ? 'Search Results' : 'Live Messages'}
            <Badge count={displayMessages.length} showZero style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        extra={
          <Space>
            {isSearchMode && (
              <Tooltip title="Show Live Messages">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => setIsSearchMode(false)}
                />
              </Tooltip>
            )}
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
          {displayMessages.length === 0 ? (
            <Empty
              description={
                isSearchMode
                  ? 'No messages match your search criteria'
                  : 'No messages received yet'
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '40px 0' }}
            />
          ) : (
            <List
              dataSource={displayMessages}
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
