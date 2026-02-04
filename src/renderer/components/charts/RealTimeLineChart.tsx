import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { theme } from 'antd';
import { format } from 'date-fns';
import type { ChartDataPoint, ChartMetricConfig } from '../../types/charts';

interface Props {
  dataPoints: Map<string, ChartDataPoint[]>;
  metrics: ChartMetricConfig[];
  aggregationWindow: number;
}

export const RealTimeLineChart: React.FC<Props> = ({ dataPoints, metrics, aggregationWindow }) => {
  const { token } = theme.useToken();

  // Merge all data points by timestamp
  const chartData = useMemo(() => {
    const timestampMap = new Map<number, any>();

    metrics.filter((m) => m.enabled).forEach((metric) => {
      const points = dataPoints.get(metric.topic) || [];
      const aggregated =
        aggregationWindow > 0 ? aggregateDataPoints(points, aggregationWindow) : points;

      aggregated.forEach((point) => {
        if (!timestampMap.has(point.timestamp)) {
          timestampMap.set(point.timestamp, { timestamp: point.timestamp });
        }
        timestampMap.get(point.timestamp)![metric.topic] = point.value;
      });
    });

    return Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [dataPoints, metrics, aggregationWindow]);

  // Downsample if too many points
  const displayData = useMemo(() => {
    if (chartData.length <= 2000) return chartData;
    return downsampleByTime(chartData, 2000);
  }, [chartData]);

  if (displayData.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: token.colorTextSecondary }}>No data points to display</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={displayData}>
        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
          stroke={token.colorText}
        />
        <YAxis stroke={token.colorText} />
        <Tooltip
          labelFormatter={(ts) => format(new Date(ts), 'yyyy-MM-dd HH:mm:ss')}
          contentStyle={{
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorder}`,
          }}
        />
        <Legend />
        {metrics
          .filter((m) => m.enabled)
          .map((metric) => (
            <Line
              key={metric.topic}
              type="monotone"
              dataKey={metric.topic}
              name={metric.label}
              stroke={metric.color}
              dot={false}
              isAnimationActive={false}
            />
          ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Aggregate data points into time buckets
 */
function aggregateDataPoints(points: ChartDataPoint[], windowMs: number): ChartDataPoint[] {
  const buckets = new Map<number, ChartDataPoint[]>();

  points.forEach((point) => {
    const bucket = Math.floor(point.timestamp / windowMs) * windowMs;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(point);
  });

  return Array.from(buckets.entries()).map(([timestamp, bucketPoints]) => ({
    timestamp,
    value: bucketPoints.reduce((sum, p) => sum + p.value, 0) / bucketPoints.length,
    topic: bucketPoints[0].topic,
    messageId: bucketPoints[0].messageId,
  }));
}

/**
 * Downsample data by taking every Nth point
 */
function downsampleByTime(data: any[], targetCount: number): any[] {
  if (data.length <= targetCount) return data;
  const step = Math.ceil(data.length / targetCount);
  return data.filter((_, i) => i % step === 0);
}
