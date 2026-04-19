import { useMemo, useState } from "react";
import { CheckCircle2, ListChecks, MessageSquare, Pencil, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useDeleteMarketplaceListing,
  useMarkListingSold,
  useMyMarketplaceInquiries,
  useMyMarketplaceListings,
  useUpdateInquiryStatus,
  useUpdateMarketplaceListing,
  useUploadMarketplaceImage,
} from "@/hooks/use-marketplace";
import type { MarketplaceListing } from "@/lib/api";
import { toast } from "sonner";

const MyListings = () => {
  const { t } = useLanguage();
  const myListingsQuery = useMyMarketplaceListings();
  const inquiriesQuery = useMyMarketplaceInquiries();
  const markSold = useMarkListingSold();
  const deleteListing = useDeleteMarketplaceListing();
  const updateListing = useUpdateMarketplaceListing();
  const uploadImage = useUploadMarketplaceImage();
  const updateInquiryStatus = useUpdateInquiryStatus();

  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<MarketplaceListing>>({});
  const [editFiles, setEditFiles] = useState<File[]>([]);

  const activeListings = useMemo(
    () => (myListingsQuery.data?.items || []).filter((item) => item.status === "active"),
    [myListingsQuery.data?.items]
  );
  const soldListings = useMemo(
    () => (myListingsQuery.data?.items || []).filter((item) => item.status === "sold"),
    [myListingsQuery.data?.items]
  );
  const pendingListings = useMemo(
    () => (myListingsQuery.data?.items || []).filter((item) => item.status === "pending"),
    [myListingsQuery.data?.items]
  );

  const openInquiries = (inquiriesQuery.data?.as_seller || []).filter((inquiry) => inquiry.status === "open").length;

  const startEdit = (listing: MarketplaceListing) => {
    setEditingListingId(listing.id);
    setEditFiles([]);
    setEditDraft({
      title: listing.title,
      kind: listing.kind,
      quantity: listing.quantity,
      unit: listing.unit,
      price_per_unit: listing.price_per_unit,
      location: listing.location,
      description: listing.description,
      images: listing.images,
    });
  };

  const cancelEdit = () => {
    setEditingListingId(null);
    setEditDraft({});
    setEditFiles([]);
  };

  const handleMarkSold = async (listingId: number) => {
    try {
      await markSold.mutateAsync(listingId);
      toast.success("Listing marked as sold");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update listing";
      toast.error(message);
    }
  };

  const handleDelete = async (listingId: number) => {
    try {
      await deleteListing.mutateAsync(listingId);
      toast.success("Listing deleted");
      if (editingListingId === listingId) {
        cancelEdit();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete listing";
      toast.error(message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingListingId) {
      return;
    }

    try {
      const uploadedUrls: string[] = [];
      for (const file of editFiles) {
        const result = await uploadImage.mutateAsync(file);
        uploadedUrls.push(result.image_url);
      }

      await updateListing.mutateAsync({
        listingId: editingListingId,
        payload: {
          title: String(editDraft.title || ""),
          kind: (editDraft.kind as "crop" | "seed") || "crop",
          quantity: Number(editDraft.quantity || 0),
          unit: String(editDraft.unit || ""),
          price_per_unit: Number(editDraft.price_per_unit || 0),
          location: String(editDraft.location || ""),
          description: String(editDraft.description || ""),
          image_urls: uploadedUrls.length > 0 ? uploadedUrls : (editDraft.images || []).map((item) => item.image_url),
          accepted_policy: true,
        },
      });

      toast.success("Listing updated and sent for moderation");
      cancelEdit();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update listing";
      toast.error(message);
    }
  };

  const handleInquiryStatus = async (inquiryId: number, status: "responded" | "closed") => {
    try {
      await updateInquiryStatus.mutateAsync({ inquiryId, status });
      toast.success(`Inquiry marked as ${status}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update inquiry";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("sell_dashboard_title")}</h1>
        <p className="text-muted-foreground mt-1">{t("sell_dashboard_subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="agri-card">
          <p className="text-sm text-muted-foreground">{t("sell_active_listings")}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{activeListings.length}</p>
        </div>
        <div className="agri-card">
          <p className="text-sm text-muted-foreground">{t("sell_pending_review")}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{pendingListings.length}</p>
        </div>
        <div className="agri-card">
          <p className="text-sm text-muted-foreground">{t("sell_sold_listings")}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{soldListings.length}</p>
        </div>
        <div className="agri-card">
          <p className="text-sm text-muted-foreground">{t("sell_open_buy_requests")}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{openInquiries}</p>
        </div>
      </div>

      <div className="agri-card">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">{t("sell_your_sale_posts")}</h2>
        </div>

        {myListingsQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        )}

        {!myListingsQuery.isLoading && (myListingsQuery.data?.items.length || 0) === 0 && (
          <p className="text-sm text-muted-foreground">{t("sell_no_posts")}</p>
        )}

        <div className="space-y-3">
          {myListingsQuery.data?.items.map((listing) => (
            <div key={listing.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{listing.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {listing.quantity} {listing.unit} · {listing.price_per_unit.toFixed(2)} per {listing.unit}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      listing.status === "active"
                        ? "bg-primary/10 text-primary"
                        : listing.status === "pending"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {listing.status}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => startEdit(listing)}>
                    <Pencil size={14} className="mr-1.5" /> {t("sell_edit")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void handleDelete(listing.id)}>
                    <Trash2 size={14} className="mr-1.5" /> {t("sell_delete")}
                  </Button>
                  {listing.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => void handleMarkSold(listing.id)}>
                      <CheckCircle2 size={14} className="mr-1.5" /> {t("sell_mark_sold")}
                    </Button>
                  )}
                </div>
              </div>

              {editingListingId === listing.id && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("market_title_label")}</Label>
                    <Input
                      value={String(editDraft.title || "")}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("market_quantity_label")}</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={Number(editDraft.quantity || 0)}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, quantity: Number(e.target.value || 0) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("market_price_per_unit_label")}</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={Number(editDraft.price_per_unit || 0)}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, price_per_unit: Number(e.target.value || 0) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("market_unit_label")}</Label>
                    <Input
                      value={String(editDraft.unit || "")}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, unit: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("market_location_label")}</Label>
                    <Input
                      value={String(editDraft.location || "")}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("market_description_label")}</Label>
                    <Textarea
                      value={String(editDraft.description || "")}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("sell_replace_images")}</Label>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(e) => setEditFiles(Array.from(e.target.files || []).slice(0, 5))}
                    />
                    {editFiles.length > 0 && (
                      <p className="text-xs text-muted-foreground">{t("sell_new_images_selected", { count: String(editFiles.length) })}</p>
                    )}
                  </div>

                  <div className="md:col-span-2 flex gap-2">
                    <Button onClick={() => void handleSaveEdit()} disabled={updateListing.isPending || uploadImage.isPending}>
                      {t("sell_save_changes")}
                    </Button>
                    <Button variant="outline" onClick={cancelEdit}>
                      {t("sell_cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="agri-card">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">{t("sell_buyer_messages")}</h2>
        </div>

        {inquiriesQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {!inquiriesQuery.isLoading && (inquiriesQuery.data?.as_seller.length || 0) === 0 && (
          <p className="text-sm text-muted-foreground">{t("sell_no_buyer_messages")}</p>
        )}

        <div className="space-y-3">
          {inquiriesQuery.data?.as_seller.map((inquiry) => (
            <div key={inquiry.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{inquiry.listing_title}</p>
                  <p className="text-xs text-muted-foreground mb-1">{t("sell_from")}: {inquiry.buyer_name || t("sell_buyer")}</p>
                  <p className="text-sm text-foreground">{inquiry.message}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{inquiry.status}</span>
              </div>

              <div className="mt-3 flex gap-2">
                {inquiry.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => void handleInquiryStatus(inquiry.id, "responded")}>
                    <CheckCircle2 size={14} className="mr-1.5" /> {t("sell_mark_replied")}
                  </Button>
                )}
                {inquiry.status !== "closed" && (
                  <Button size="sm" variant="outline" onClick={() => void handleInquiryStatus(inquiry.id, "closed")}>
                    <XCircle size={14} className="mr-1.5" /> {t("sell_close_request")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyListings;
