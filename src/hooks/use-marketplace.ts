import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  type CreateMarketplaceListingPayload,
  type MarketplaceListing,
  type MarketplaceListingStatus,
  type MarketplaceListingsResponse,
  type MarketplaceInquiry,
  type MarketplaceInquiryStatus,
  type MarketplaceMyInquiriesResponse,
  type UpdateMarketplaceListingPayload,
} from "@/lib/api";

export const marketplaceQueryKeys = {
  listings: (params?: { kind?: string; location?: string; search?: string; page?: number; limit?: number }) =>
    ["marketplace", "listings", params?.kind || "all", params?.location || "all", params?.search || "", params?.page || 1, params?.limit || 10] as const,
  myListings: ["marketplace", "my-listings"] as const,
  myInquiries: ["marketplace", "my-inquiries"] as const,
  adminListings: (status?: MarketplaceListingStatus) => ["marketplace", "admin-listings", status || "all"] as const,
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

export const useMyMarketplaceInquiries = () =>
  useQuery<MarketplaceMyInquiriesResponse>({
    queryKey: marketplaceQueryKeys.myInquiries,
    queryFn: () => apiClient.getMyMarketplaceInquiries(),
    staleTime: 30 * 1000,
  });

export const useMarketplaceAdminListings = (status?: MarketplaceListingStatus) =>
  useQuery<{ items: MarketplaceListing[] }>({
    queryKey: marketplaceQueryKeys.adminListings(status),
    queryFn: () => apiClient.getMarketplaceAdminListings(status),
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

export const useUploadMarketplaceImage = () => {
  return useMutation({
    mutationFn: (file: File) => apiClient.uploadMarketplaceImage(file),
  });
};

export const useSendMarketplaceInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation<MarketplaceInquiry, Error, { listingId: number; message: string }>({
    mutationFn: ({ listingId, message }) => apiClient.createMarketplaceInquiry(listingId, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};

export const useUpdateInquiryStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<MarketplaceInquiry, Error, { inquiryId: number; status: MarketplaceInquiryStatus }>({
    mutationFn: ({ inquiryId, status }) => apiClient.updateMarketplaceInquiryStatus(inquiryId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};

export const useModerateMarketplaceListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { listingId: number; action: "approve" | "block" | "reject"; reason?: string }) =>
      apiClient.moderateMarketplaceListing(payload.listingId, {
        action: payload.action,
        reason: payload.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
};
