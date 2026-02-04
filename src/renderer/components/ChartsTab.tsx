import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Space, Empty } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { ChartConfigPanel } from './charts/ChartConfigPanel';
import { RealTimeLineChart } from './charts/RealTimeLineChart';
import { StatisticsPanel } from './charts/StatisticsPanel';
import { extractValue } from '../utils/valueExtractor';
import type { ChartDataPoint, ChartMetricConfig, TimeRangePreset } from '../types/charts';
import type { MqttMessage } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';
import dayjs, { Dayjs } from 'dayjs';

export const ChartsTab: React.FC = () => {
  const [metrics, setMetrics] = useState<ChartMetricConfig[]>([]);
  const [dataPoints, setDataPoints] = useState<Map<string, ChartDataPoint[]>>(new Map());
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>('live');
  const [customTimeRange, setCustomTimeRange] = useState<[Dayjs, Dayjs]>();
  const [aggregationWindow, setAggregationWindow] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  // Load available topics from topic tree
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const tree = await window.electronAPI.invoke(IPC_CHANNELS.TOPIC_TREE_GET);
        const topics = extractTopicPaths(tree);
        setAvailableTopics(topics);
      } catch (error) {
        console.error('Failed to load topics:', error);
      }
    };

    loadTopics();

    const removeListener = window.electronAPI.on(IPC_CHANNELS.TOPIC_TREE_UPDATED, loadTopics);
    return removeListener;
  }, []);

  // Real-time message listener
  useEffect(() => {
    if (!autoRefresh || timeRangePreset !== 'live') return;

    const removeListener = window.electronAPI.on(
      IPC_CHANNELS.MQTT_MESSAGE,
      (message: MqttMessage) => {
        metrics.forEach((metric) => {
          if (!metric.enabled) return;
          if (!topicMatches(message.topic, metric.topic)) return;

          const result = extractValue(message.payload, {
            jsonFieldHints: metric.fieldHints,
            topicHint: message.topic,
          });

          if (result.value !== null) {
            addDataPoint({
              timestamp: message.timestamp,
              value: result.value,
              topic: metric.topic,
              messageId: message.id,
            });
          }
        });
      }
    );

    return removeListener;
  }, [metrics, autoRefresh, timeRangePreset]);

  // Historical data loading
  useEffect(() => {
    if (timeRangePreset === 'live' || metrics.length === 0) return;

    const loadHistoricalData = async () => {
      let startTime: number, endTime: number;

      if (timeRangePreset === 'custom' && customTimeRange) {
        startTime = customTimeRange[0].valueOf();
        endTime = customTimeRange[1].valueOf();
      } else if (timeRangePreset === '1h') {
        endTime = Date.now();
        startTime = endTime - 60 * 60 * 1000;
      } else if (timeRangePreset === '24h') {
        endTime = Date.now();
        startTime = endTime - 24 * 60 * 60 * 1000;
      } else {
        return;
      }

      try {
        const messages = await window.electronAPI.invoke(IPC_CHANNELS.MESSAGE_SEARCH, {
          startTime,
          endTime,
          limit: 50000,
        });

        const newDataPoints = new Map<string, ChartDataPoint[]>();

        messages.forEach((msg: MqttMessage) => {
          metrics.forEach((metric) => {
            if (!metric.enabled) return;
            if (!topicMatches(msg.topic, metric.topic)) return;

            const result = extractValue(msg.payload, {
              jsonFieldHints: metric.fieldHints,
            });

            if (result.value !== null) {
              if (!newDataPoints.has(metric.topic)) {
                newDataPoints.set(metric.topic, []);
              }
              newDataPoints.get(metric.topic)!.push({
                timestamp: msg.timestamp,
                value: result.value,
                topic: metric.topic,
                messageId: msg.id,
              });
            }
          });
        });

        // Sort data points by timestamp
        newDataPoints.forEach((points) => {
          points.sort((a, b) => a.timestamp - b.timestamp);
        });

        setDataPoints(newDataPoints);
      } catch (error) {
        console.error('Failed to load historical data:', error);
      }
    };

    loadHistoricalData();
  }, [timeRangePreset, customTimeRange, metrics]);

  const addDataPoint = useCallback((point: ChartDataPoint) => {
    setDataPoints((prev) => {
      const newMap = new Map(prev);
      const topicData = newMap.get(point.topic) || [];

      topicData.push(point);

      // Keep only last 1 hour for live mode
      const cutoff = Date.now() - 60 * 60 * 1000;
      const filtered = topicData.filter((p) => p.timestamp >= cutoff);

      // Sort by timestamp
      filtered.sort((a, b) => a.timestamp - b.timestamp);

      newMap.set(point.topic, filtered);
      return newMap;
    });
  }, []);

  // Clear data points when switching from live to historical or vice versa
  useEffect(() => {
    if (timeRangePreset === 'live') {
      setDataPoints(new Map());
    }
  }, [timeRangePreset]);

  const hasData = metrics.some((m) => m.enabled && (dataPoints.get(m.topic)?.length || 0) > 0);

  return (
    <Row gutter={[16, 16]}>
      <Col span={6}>
        <Card title="Configuration" size="small">
          <ChartConfigPanel
            availableTopics={availableTopics}
            metrics={metrics}
            onMetricsChange={setMetrics}
            timeRangePreset={timeRangePreset}
            onTimeRangePresetChange={setTimeRangePreset}
            customTimeRange={customTimeRange}
            onCustomTimeRangeChange={setCustomTimeRange}
            aggregationWindow={aggregationWindow}
            onAggregationWindowChange={setAggregationWindow}
            autoRefresh={autoRefresh}
            onAutoRefreshChange={setAutoRefresh}
          />
        </Card>
      </Col>

      <Col span={18}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card
            title={
              <Space>
                <LineChartOutlined />
                {timeRangePreset === 'live' ? 'Real-Time Chart' : 'Historical Chart'}
              </Space>
            }
          >
            {hasData ? (
              <RealTimeLineChart
                dataPoints={dataPoints}
                metrics={metrics}
                aggregationWindow={aggregationWindow}
              />
            ) : (
              <Empty
                description={
                  metrics.length === 0
                    ? 'Add topics from the configuration panel to start charting'
                    : 'No data to display. Start receiving messages or adjust the time range.'
                }
                style={{ padding: '40px 0' }}
              />
            )}
          </Card>

          {hasData && (
            <Card title="Statistics">
              <StatisticsPanel dataPoints={dataPoints} metrics={metrics} />
            </Card>
          )}
        </Space>
      </Col>
    </Row>
  );
};

/**
 * Extract all topic paths from topic tree
 */
function extractTopicPaths(tree: any[]): string[] {
  const paths: string[] = [];

  function traverse(nodes: any[]) {
    nodes.forEach((node) => {
      if (node.fullPath) {
        paths.push(node.fullPath);
      }
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  }

  traverse(tree);
  return [...new Set(paths)].sort();
}

/**
 * Check if message topic matches filter topic
 * TODO: Add MQTT wildcard support (+, #)
 */
function topicMatches(messageTopic: string, filterTopic: string): boolean {
  return messageTopic === filterTopic;
}
