import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  type CreateMarketplaceListingPayload,
  type MarketplaceListing,
  type MarketplaceListingsResponse,
  type UpdateMarketplaceListingPayload,
} from "@/lib/api";

export const marketplaceQueryKeys = {
  listings: (params?: { kind?: string; location?: string; search?: string; page?: number; limit?: number }) =>
    ["marketplace", "listings", params?.kind || "all", params?.location || "all", params?.search || "", params?.page || 1, params?.limit || 10] as const,
  myListings: ["marketplace", "my-listings"] as const,
};

export const useMarketplaceListings = (params?: {
  kind?: "crop" | "seed";
  location?: string;
  search?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery<MarketplaceListingsResponse>({
    queryKey: marketplaceQueryKeys.listings(params),
    queryFn: () => apiClient.getMarketplaceListings(params),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

export const useMyMarketplaceListings = () =>
  useQuery<{ items: MarketplaceListing[] }>({
    queryKey: marketplaceQueryKeys.myListings,
    queryFn: () => apiClient.getMyMarketplaceListings(),
    staleTime: 30 * 1000,
  });

export const useCreateMarketplaceListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMarketplaceListingPayload) => apiClient.createMarketplaceListing(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};

export const useMarkListingSold = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: number) => apiClient.markMarketplaceListingSold(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};

export const useUpdateMarketplaceListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, payload }: { listingId: number; payload: UpdateMarketplaceListingPayload }) =>
      apiClient.updateMarketplaceListing(listingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};

export const useDeleteMarketplaceListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: number) => apiClient.deleteMarketplaceListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};

export const useUploadMarketplaceImage = () =>
  useMutation({
    mutationFn: (file: File) => apiClient.uploadMarketplaceImage(file),
  });
