import { decode as msgpackDecode } from '@msgpack/msgpack';
import { Buffer } from 'buffer';

export interface ValueExtractionResult {
  value: number | null;
  error?: string;
  format: 'raw' | 'json' | 'msgpack' | 'binary' | 'unknown';
  fieldPath?: string;
}

export interface ValueExtractorOptions {
  jsonFieldHints?: string[];
  topicHint?: string;
}

/**
 * Extract numeric value from MQTT message payload
 * Tries multiple strategies: raw number → JSON fields → binary float
 */
export function extractValue(
  payload: Buffer | string,
  options?: ValueExtractorOptions
): ValueExtractionResult {
  // 1. Try raw number parsing
  const str = payload.toString();
  const num = parseFloat(str.trim());
  if (!isNaN(num)) {
    return { value: num, format: 'raw' };
  }

  // 2. Try JSON extraction
  try {
    const obj = JSON.parse(str);

    // Try user-provided hints first
    if (options?.jsonFieldHints) {
      for (const hint of options.jsonFieldHints) {
        if (!hint) continue;
        const val = getNestedValue(obj, hint);
        if (typeof val === 'number') {
          return { value: val, format: 'json', fieldPath: hint };
        }
        // Try parsing string numbers
        if (typeof val === 'string') {
          const parsed = parseFloat(val);
          if (!isNaN(parsed)) {
            return { value: parsed, format: 'json', fieldPath: hint };
          }
        }
      }
    }

    // Try common field names
    const commonFields = ['value', 'data', 'reading', 'measurement', 'sensor_value', 'val'];
    for (const field of commonFields) {
      if (typeof obj[field] === 'number') {
        return { value: obj[field], format: 'json', fieldPath: field };
      }
      // Try parsing string numbers
      if (typeof obj[field] === 'string') {
        const parsed = parseFloat(obj[field]);
        if (!isNaN(parsed)) {
          return { value: parsed, format: 'json', fieldPath: field };
        }
      }
    }

    // Try topic-based hint (last segment of topic path)
    if (options?.topicHint) {
      const lastSegment = options.topicHint.split('/').pop();
      if (lastSegment) {
        if (typeof obj[lastSegment] === 'number') {
          return { value: obj[lastSegment], format: 'json', fieldPath: lastSegment };
        }
        // Try parsing string numbers
        if (typeof obj[lastSegment] === 'string') {
          const parsed = parseFloat(obj[lastSegment]);
          if (!isNaN(parsed)) {
            return { value: parsed, format: 'json', fieldPath: lastSegment };
          }
        }
      }
    }

    // Try nested common paths
    const nestedPaths = ['data.value', 'payload.value', 'payload.data', 'sensor.value'];
    for (const path of nestedPaths) {
      const val = getNestedValue(obj, path);
      if (typeof val === 'number') {
        return { value: val, format: 'json', fieldPath: path };
      }
    }
  } catch {
    // JSON parsing failed, continue to msgpack
  }

  // 3. Try MessagePack decoding
  if (Buffer.isBuffer(payload)) {
    try {
      const decoded = msgpackDecode(payload) as any;

      // If decoded value is directly a number
      if (typeof decoded === 'number') {
        return { value: decoded, format: 'msgpack' };
      }

      // If decoded is an object, try to extract numeric fields
      if (typeof decoded === 'object' && decoded !== null) {
        // Try user-provided hints first
        if (options?.jsonFieldHints) {
          for (const hint of options.jsonFieldHints) {
            if (!hint) continue;
            const val = getNestedValue(decoded, hint);
            if (typeof val === 'number') {
              return { value: val, format: 'msgpack', fieldPath: hint };
            }
          }
        }

        // Try common field names
        const commonFields = ['value', 'data', 'reading', 'measurement', 'sensor_value', 'val'];
        for (const field of commonFields) {
          if (typeof decoded[field] === 'number') {
            return { value: decoded[field], format: 'msgpack', fieldPath: field };
          }
        }

        // Try topic-based hint
        if (options?.topicHint) {
          const lastSegment = options.topicHint.split('/').pop();
          if (lastSegment && typeof decoded[lastSegment] === 'number') {
            return { value: decoded[lastSegment], format: 'msgpack', fieldPath: lastSegment };
          }
        }

        // Try nested common paths
        const nestedPaths = ['data.value', 'payload.value', 'payload.data', 'sensor.value'];
        for (const path of nestedPaths) {
          const val = getNestedValue(decoded, path);
          if (typeof val === 'number') {
            return { value: val, format: 'msgpack', fieldPath: path };
          }
        }
      }
    } catch {
      // MessagePack decoding failed, continue to binary
    }
  }

  // 4. Try binary float extraction
  if (Buffer.isBuffer(payload)) {
    // Try 4-byte float (IEEE 754 single precision)
    if (payload.length === 4) {
      try {
        const val = payload.readFloatLE(0);
        if (!isNaN(val) && isFinite(val)) {
          return { value: val, format: 'binary' };
        }
      } catch {
        // Continue to try big-endian
      }

      try {
        const val = payload.readFloatBE(0);
        if (!isNaN(val) && isFinite(val)) {
          return { value: val, format: 'binary' };
        }
      } catch {
        // Failed
      }
    }

    // Try 8-byte double (IEEE 754 double precision)
    if (payload.length === 8) {
      try {
        const val = payload.readDoubleLE(0);
        if (!isNaN(val) && isFinite(val)) {
          return { value: val, format: 'binary' };
        }
      } catch {
        // Continue to try big-endian
      }

      try {
        const val = payload.readDoubleBE(0);
        if (!isNaN(val) && isFinite(val)) {
          return { value: val, format: 'binary' };
        }
      } catch {
        // Failed
      }
    }
  }

  // 5. Failed to extract
  return {
    value: null,
    format: 'unknown',
    error: 'Could not extract numeric value from payload',
  };
}

/**
 * Get nested value from object using dot notation path
 * @example getNestedValue({a: {b: 5}}, 'a.b') => 5
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
}
