import { Row, Col, Statistic, Card } from 'antd';
import type { ChartDataPoint, ChartMetricConfig } from '../../types/charts';

interface Props {
  dataPoints: Map<string, ChartDataPoint[]>;
  metrics: ChartMetricConfig[];
}

export const StatisticsPanel: React.FC<Props> = ({ dataPoints, metrics }) => {
  const calculateStats = (points: ChartDataPoint[]) => {
    if (points.length === 0) {
      return { min: 0, max: 0, avg: 0, latest: 0, count: 0 };
    }

    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const latest = points[points.length - 1].value;

    return { min, max, avg, latest, count: points.length };
  };

  const enabledMetrics = metrics.filter((m) => m.enabled);

  if (enabledMetrics.length === 0) {
    return null;
  }

  return (
    <Row gutter={[16, 16]}>
      {enabledMetrics.map((metric) => {
        const points = dataPoints.get(metric.topic) || [];
        const stats = calculateStats(points);

        return (
          <Col span={6} key={metric.topic}>
            <Card
              size="small"
              title={metric.label}
              styles={{ body: { padding: '12px' } }}
              style={{ borderLeft: `4px solid ${metric.color}` }}
            >
              <Statistic
                title="Latest"
                value={stats.latest}
                precision={2}
                valueStyle={{ fontSize: '18px' }}
              />
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Statistic
                  title="Min"
                  value={stats.min}
                  precision={2}
                  valueStyle={{ fontSize: '14px' }}
                />
                <Statistic
                  title="Max"
                  value={stats.max}
                  precision={2}
                  valueStyle={{ fontSize: '14px' }}
                />
                <Statistic
                  title="Avg"
                  value={stats.avg}
                  precision={2}
                  valueStyle={{ fontSize: '14px' }}
                />
                <Statistic
                  title="Count"
                  value={stats.count}
                  valueStyle={{ fontSize: '14px' }}
                />
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};
