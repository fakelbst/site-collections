import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from "@/config";
import type { AddSitePayload, AddSiteResponse } from "@/types";

const addKey = import.meta.env.VITE_ADD_KEY?.trim();

export const requestAddSite = async (
  payload: AddSitePayload,
  secretKey = addKey,
): Promise<AddSiteResponse> => {
  const response = await fetch(getApiUrl('/api/add'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secretKey ? { 'x-secret-key': secretKey } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Unable to add the site. Please check the URL and Worker configuration.');
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
