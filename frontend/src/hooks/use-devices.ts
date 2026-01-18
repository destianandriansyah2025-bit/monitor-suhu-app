import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

export function useUpdateDeviceConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, config }: { id: string; config: any }) => {
      const res = await fetch(`/api/devices/${id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Failed to update device config');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Configuration sent to device' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update configuration', variant: 'destructive' });
    }
  });
}