import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  ContentClickTelemetry,
  HeadlineResponse,
  NewsItem,
  OfferItem,
  PaginatedResponse,
} from "@/lib/api";

const CACHE_STALE_MS = 30 * 1000;
const CACHE_GC_MS = 30 * 60 * 1000;
const PAGE_SIZE = 6;

export const newsQueryKeys = {
  headlines: ["news", "headlines"] as const,
  newsList: (region?: string) => ["news", "list", region || "all"] as const,
  offersList: (region?: string) => ["news", "offers", region || "all"] as const,
};

export const useNewsHeadlines = () =>
  useQuery<HeadlineResponse>({
    queryKey: newsQueryKeys.headlines,
    queryFn: () => apiClient.getNewsHeadlines(3),
    staleTime: CACHE_STALE_MS,
    gcTime: CACHE_GC_MS,
  });

export const useInfiniteNewsFeed = (region?: string) =>
  useInfiniteQuery<PaginatedResponse<NewsItem>>({
    queryKey: newsQueryKeys.newsList(region),
    queryFn: ({ pageParam }) =>
      apiClient.getNewsFeed({
        page: Number(pageParam || 1),
        limit: PAGE_SIZE,
        region,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
    staleTime: CACHE_STALE_MS,
    gcTime: CACHE_GC_MS,
  });

export const useInfiniteOffersFeed = (region?: string) =>
  useInfiniteQuery<PaginatedResponse<OfferItem>>({
    queryKey: newsQueryKeys.offersList(region),
    queryFn: ({ pageParam }) =>
      apiClient.getOffersFeed({
        page: Number(pageParam || 1),
        limit: PAGE_SIZE,
        region,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
    staleTime: CACHE_STALE_MS,
    gcTime: CACHE_GC_MS,
  });

export const useContentTelemetry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ContentClickTelemetry) => apiClient.trackContentClick(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["telemetry"] });
    },
  });
};
