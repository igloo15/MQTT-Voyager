/**
 * Type definitions for Charts feature
 */

/**
 * Single data point for charting
 */
export interface ChartDataPoint {
  timestamp: number;
  value: number;
  topic: string;
  messageId: string;
}

/**
 * Configuration for a single metric/topic to chart
 */
export interface ChartMetricConfig {
  topic: string;
  enabled: boolean;
  color: string;
  label: string;
  fieldHints?: string[]; // JSON field names to try for value extraction
}

/**
 * Time range preset options
 */
export type TimeRangePreset = 'live' | '1h' | '24h' | 'custom';

/**
 * Custom time range
 */
export interface TimeRange {
  start: number;
  end: number;
}

/**
 * Complete chart state
 */
export interface ChartState {
  metrics: ChartMetricConfig[];
  timeRangePreset: TimeRangePreset;
  customTimeRange?: TimeRange;
  aggregationWindow: number; // milliseconds (0 = raw points, no aggregation)
  autoRefresh: boolean;
  dataPoints: Map<string, ChartDataPoint[]>; // Keyed by topic
}
