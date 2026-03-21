import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from "@/config";
import type { AddSitePayload, AddSiteResponse } from "@/types";

const addKey = import.meta.env.VITE_ADD_KEY?.trim();

const requestAddSite = async (payload: AddSitePayload): Promise<AddSiteResponse> => {
  const response = await fetch(getApiUrl('/api/add'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(addKey ? { 'x-secret-key': addKey } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? '添加站点失败，请确认链接和 Worker 配置。');
  }

  return (await response.json()) as AddSiteResponse;
};

export const useAddSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => requestAddSite({ url }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
};

