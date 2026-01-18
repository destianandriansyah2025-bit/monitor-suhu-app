import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertReading } from "@shared/schema";

// GET /api/readings/current
export function useCurrentReading() {
  return useQuery({
    queryKey: [api.readings.current.path],
    queryFn: async () => {
      const res = await fetch(api.readings.current.path);
      if (!res.ok) throw new Error("Failed to fetch current reading");
      return api.readings.current.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });
}

// GET /api/readings (list with filters)
export function useReadings(period?: 'day' | 'week' | 'month', limit?: number) {
  return useQuery({
    queryKey: [api.readings.list.path, period, limit],
    queryFn: async () => {
      const url = buildUrl(api.readings.list.path);
      const params = new URLSearchParams();
      if (period) params.append("period", period);
      if (limit) params.append("limit", limit.toString());
      
      const res = await fetch(`${url}?${params.toString()}`, {
        cache: 'no-cache', // Force fresh data from server
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) throw new Error("Failed to fetch readings history");
      return api.readings.list.responses[200].parse(await res.json());
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// POST /api/sensor (create reading - usually for simulation or manual entry)
export function useCreateReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertReading) => {
      const validated = api.readings.create.input.parse(data);
      const res = await fetch(api.readings.create.path, {
        method: api.readings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message);
        }
        throw new Error("Failed to create reading");
      }
      return api.readings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.readings.current.path] });
      queryClient.invalidateQueries({ queryKey: [api.readings.list.path] });
    },
  });
}
