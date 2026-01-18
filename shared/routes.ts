import { z } from 'zod';
import {
  insertReadingSchema,
  insertDeviceSchema,
  insertAlertSchema,
  type Reading,
  type Device,
  type Alert
} from './schema';

// Get API base URL from environment
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side
    return import.meta.env.VITE_API_URL || '';
  }
  // Server-side
  return process.env.VITE_API_URL || '';
};

const API_BASE = getApiBaseUrl();

export const api = {
  readings: {
    current: {
      method: 'GET' as const,
      path: `${API_BASE}/api/readings/current`,
      responses: {
        200: z.custom<Reading>().nullable(),
      },
    },
    list: {
      method: 'GET' as const,
      path: `${API_BASE}/api/readings`,
      input: z.object({
        period: z.enum(['day', 'week', 'month']).optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<Reading>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: `${API_BASE}/api/sensor`,
      input: insertReadingSchema,
      responses: {
        201: z.custom<Reading>(),
        400: z.object({ message: z.string() }),
      },
    },
  },
  devices: {
    list: {
      method: 'GET' as const,
      path: `${API_BASE}/api/devices`,
      responses: {
        200: z.array(z.custom<Device>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: `${API_BASE}/api/devices/:id`,
      responses: {
        200: z.custom<Device>(),
        404: z.object({ message: z.string() }),
      },
    },
    create: {
      method: 'POST' as const,
      path: `${API_BASE}/api/devices`,
      input: insertDeviceSchema,
      responses: {
        201: z.custom<Device>(),
        400: z.object({ message: z.string() }),
      },
    },
    update: {
      method: 'PUT' as const,
      path: `${API_BASE}/api/devices/:id`,
      input: insertDeviceSchema.partial(),
      responses: {
        200: z.custom<Device>(),
        404: z.object({ message: z.string() }),
      },
    },
    updateConfig: {
      method: 'PUT' as const,
      path: `${API_BASE}/api/devices/:id/config`,
      input: z.object({
        intervalSec: z.number().min(2).max(300).optional(),
        tempMin: z.number().optional(),
        tempMax: z.number().optional(),
        humMin: z.number().optional(),
        humMax: z.number().optional(),
        deviceEnabled: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<Device>(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  alerts: {
    list: {
      method: 'GET' as const,
      path: `${API_BASE}/api/alerts`,
      input: z.object({
        deviceId: z.string().optional(),
        acknowledged: z.boolean().optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<Alert>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: `${API_BASE}/api/alerts`,
      input: insertAlertSchema,
      responses: {
        201: z.custom<Alert>(),
        400: z.object({ message: z.string() }),
      },
    },
    acknowledge: {
      method: 'PUT' as const,
      path: `${API_BASE}/api/alerts/:id/acknowledge`,
      responses: {
        200: z.custom<Alert>(),
        404: z.object({ message: z.string() }),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}