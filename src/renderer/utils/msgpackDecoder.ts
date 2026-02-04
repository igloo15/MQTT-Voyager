import { decode as msgpackDecode } from '@msgpack/msgpack';

export interface MsgpackDecodeResult {
  success: boolean;
  data?: any;
  error?: string;
  formatted?: string;
}

/**
 * Attempt to decode a MessagePack payload
 * Returns the decoded data and a formatted string representation
 */
export function decodeMsgpack(payload: Buffer | Uint8Array): MsgpackDecodeResult {
  try {
    const decoded = msgpackDecode(payload);

    // Format the decoded data for display
    let formatted: string;
    if (typeof decoded === 'object' && decoded !== null) {
      formatted = JSON.stringify(decoded, null, 2);
    } else {
      formatted = String(decoded);
    }

    return {
      success: true,
      data: decoded,
      formatted,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to decode MessagePack',
    };
  }
}

/**
 * Check if a buffer is likely MessagePack encoded
 * This is a heuristic check based on MessagePack format markers
 */
export function isMsgpack(payload: Buffer | Uint8Array): boolean {
  if (!payload || payload.length === 0) return false;

  const firstByte = payload[0];

  // MessagePack format uses specific byte markers
  // Fixint, nil, false, true: 0x00-0xff
  // Common map/array/str markers: 0x80-0x9f (fixmap, fixarray, fixstr)
  // More markers: 0xa0-0xbf (fixstr), 0xc0-0xdf (various types)

  // Check for common MessagePack markers
  // Maps: 0x80-0x8f (fixmap), 0xde (map 16), 0xdf (map 32)
  // Arrays: 0x90-0x9f (fixarray), 0xdc (array 16), 0xdd (array 32)
  // Strings: 0xa0-0xbf (fixstr), 0xd9-0xdb (str8/16/32)
  // Numbers: 0xca-0xcb (float/double), 0xcc-0xd3 (uint/int variants)

  const isMsgpackMarker =
    (firstByte >= 0x80 && firstByte <= 0x9f) || // fixmap or fixarray
    (firstByte >= 0xa0 && firstByte <= 0xbf) || // fixstr
    (firstByte >= 0xc0 && firstByte <= 0xdf) || // various types
    firstByte === 0xdc || firstByte === 0xdd || // array 16/32
    firstByte === 0xde || firstByte === 0xdf;   // map 16/32

  // Also try to decode to verify
  if (isMsgpackMarker) {
    try {
      msgpackDecode(payload);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Try to decode payload as JSON or MessagePack
 * Returns formatted string for display
 */
export function decodePayload(payload: Buffer | string): string {
  // Try string/JSON first
  const str = payload.toString();
  try {
    const json = JSON.parse(str);
    return JSON.stringify(json, null, 2);
  } catch {
    // Not JSON, continue
  }

  // Try MessagePack if buffer
  if (Buffer.isBuffer(payload)) {
    const result = decodeMsgpack(payload);
    if (result.success && result.formatted) {
      return `[MessagePack]\n${result.formatted}`;
    }
  }

  // Return as-is
  return str;
}
