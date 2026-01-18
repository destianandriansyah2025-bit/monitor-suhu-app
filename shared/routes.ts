import { z } from 'zod';
import { insertReadingSchema, readings, insertDeviceSchema, devices, insertAlertSchema, alerts } from './schema';

export const api = {
  readings: {
    current: {
      method: 'GET' as const,
      path: '/api/readings/current',
      responses: {
        200: z.custom<typeof readings.$inferSelect>().nullable(),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/readings',
      input: z.object({
        period: z.enum(['day', 'week', 'month']).optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof readings.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sensor',
      input: insertReadingSchema,
      responses: {
        201: z.custom<typeof readings.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
  },
  devices: {
    list: {
      method: 'GET' as const,
      path: '/api/devices',
      responses: {
        200: z.array(z.custom<typeof devices.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/devices/:id',
      responses: {
        200: z.custom<typeof devices.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/devices',
      input: insertDeviceSchema,
      responses: {
        201: z.custom<typeof devices.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/devices/:id',
      input: insertDeviceSchema.partial(),
      responses: {
        200: z.custom<typeof devices.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
    updateConfig: {
      method: 'PUT' as const,
      path: '/api/devices/:id/config',
      input: z.object({
        intervalSec: z.number().min(2).max(300).optional(),
        tempMin: z.number().optional(),
        tempMax: z.number().optional(),
        humMin: z.number().optional(),
        humMax: z.number().optional(),
        deviceEnabled: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof devices.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
  },
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/alerts',
      input: z.object({
        deviceId: z.string().optional(),
        acknowledged: z.boolean().optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof alerts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/alerts',
      input: insertAlertSchema,
      responses: {
        201: z.custom<typeof alerts.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    acknowledge: {
      method: 'PUT' as const,
      path: '/api/alerts/:id/acknowledge',
      responses: {
        200: z.custom<typeof alerts.$inferSelect>(),
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
