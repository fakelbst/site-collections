import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from "@/config";
import type { Site } from "@/types";

const fetchSites = async (): Promise<Site[]> => {
  const response = await fetch(getApiUrl('/api/sites'));

  if (!response.ok) {
    throw new Error('暂时无法加载收藏列表，请稍后重试。');
  }

  const data = (await response.json()) as Site[];
  return Array.isArray(data) ? data : [];
};

export const useSites = () =>
  useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites,
    staleTime: 60_000,
  });

