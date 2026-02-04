import { Form, Select, Input, Button, Space, Collapse, Switch, DatePicker, Segmented } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import type { ChartMetricConfig, TimeRangePreset } from '../../types/charts';
import type { Dayjs } from 'dayjs';

interface Props {
  availableTopics: string[];
  metrics: ChartMetricConfig[];
  onMetricsChange: (metrics: ChartMetricConfig[]) => void;
  timeRangePreset: TimeRangePreset;
  onTimeRangePresetChange: (preset: TimeRangePreset) => void;
  customTimeRange?: [Dayjs, Dayjs];
  onCustomTimeRangeChange: (range: [Dayjs, Dayjs] | undefined) => void;
  aggregationWindow: number;
  onAggregationWindowChange: (window: number) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
}

const DEFAULT_COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#faad14', '#f5222d'];

export const ChartConfigPanel: React.FC<Props> = ({
  availableTopics,
  metrics,
  onMetricsChange,
  timeRangePreset,
  onTimeRangePresetChange,
  customTimeRange,
  onCustomTimeRangeChange,
  aggregationWindow,
  onAggregationWindowChange,
  autoRefresh,
  onAutoRefreshChange,
}) => {
  const handleAddMetric = (topic: string) => {
    // Check if topic already exists
    if (metrics.some((m) => m.topic === topic)) {
      return;
    }

    const newMetric: ChartMetricConfig = {
      topic,
      enabled: true,
      color: DEFAULT_COLORS[metrics.length % DEFAULT_COLORS.length],
      label: topic,
      fieldHints: [],
    };

    onMetricsChange([...metrics, newMetric]);
  };

  const handleRemoveMetric = (index: number) => {
    onMetricsChange(metrics.filter((_, i) => i !== index));
  };

  const handleMetricChange = (index: number, updates: Partial<ChartMetricConfig>) => {
    const newMetrics = [...metrics];
    newMetrics[index] = { ...newMetrics[index], ...updates };
    onMetricsChange(newMetrics);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* Topic Selection */}
      <Form.Item label="Add Topic" style={{ marginBottom: 0 }}>
        <Select
          placeholder="Select topic to chart"
          onChange={handleAddMetric}
          value={null}
          showSearch
          disabled={availableTopics.length === 0}
        >
          {availableTopics
            .filter((topic) => !metrics.some((m) => m.topic === topic))
            .map((topic) => (
              <Select.Option key={topic} value={topic}>
                {topic}
              </Select.Option>
            ))}
        </Select>
      </Form.Item>

      {/* Metric Configuration */}
      {metrics.length > 0 && (
        <Collapse size="small">
          {metrics.map((metric, index) => (
            <Collapse.Panel
              key={metric.topic}
              header={
                <Space>
                  <Switch
                    size="small"
                    checked={metric.enabled}
                    onChange={(enabled) => handleMetricChange(index, { enabled })}
                    onClick={(_, e) => e.stopPropagation()}
                  />
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      background: metric.color,
                    }}
                  />
                  <span>{metric.label}</span>
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Input
                  placeholder="Label"
                  value={metric.label}
                  onChange={(e) => handleMetricChange(index, { label: e.target.value })}
                  size="small"
                />
                <Input
                  placeholder="Field hints (e.g., value, data.temp)"
                  value={metric.fieldHints?.join(', ') || ''}
                  onChange={(e) => {
                    const hints = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);
                    handleMetricChange(index, { fieldHints: hints });
                  }}
                  size="small"
                />
                <Button
                  danger
                  size="small"
                  icon={<MinusOutlined />}
                  onClick={() => handleRemoveMetric(index)}
                  block
                >
                  Remove
                </Button>
              </Space>
            </Collapse.Panel>
          ))}
        </Collapse>
      )}

      {/* Time Range */}
      <Form.Item label="Time Range" style={{ marginBottom: 0 }}>
        <Segmented
          value={timeRangePreset}
          onChange={onTimeRangePresetChange}
          options={[
            { label: 'Live', value: 'live' },
            { label: '1 Hour', value: '1h' },
            { label: '24 Hours', value: '24h' },
            { label: 'Custom', value: 'custom' },
          ]}
          block
        />
      </Form.Item>

      {timeRangePreset === 'custom' && (
        <Form.Item style={{ marginBottom: 0 }}>
          <DatePicker.RangePicker
            showTime
            value={customTimeRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                onCustomTimeRangeChange([dates[0], dates[1]]);
              } else {
                onCustomTimeRangeChange(undefined);
              }
            }}
            style={{ width: '100%' }}
          />
        </Form.Item>
      )}

      {/* Aggregation Window */}
      <Form.Item label="Aggregation" style={{ marginBottom: 0 }}>
        <Select value={aggregationWindow} onChange={onAggregationWindowChange}>
          <Select.Option value={0}>Raw Points</Select.Option>
          <Select.Option value={1000}>1 Second</Select.Option>
          <Select.Option value={10000}>10 Seconds</Select.Option>
          <Select.Option value={60000}>1 Minute</Select.Option>
          <Select.Option value={300000}>5 Minutes</Select.Option>
        </Select>
      </Form.Item>

      {/* Auto-refresh */}
      <Form.Item label="Auto-refresh" style={{ marginBottom: 0 }}>
        <Switch checked={autoRefresh} onChange={onAutoRefreshChange} />
      </Form.Item>
    </Space>
  );
};
