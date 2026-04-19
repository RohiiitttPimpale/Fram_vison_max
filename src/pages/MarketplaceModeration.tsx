import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplaceAdminListings, useModerateMarketplaceListing } from "@/hooks/use-marketplace";
import type { MarketplaceListingStatus } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const adminEmails = (import.meta.env.VITE_MARKETPLACE_ADMIN_EMAILS || "")
  .split(",")
  .map((item: string) => item.trim().toLowerCase())
  .filter(Boolean);

const MarketplaceModeration = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<MarketplaceListingStatus | "all">("pending");
  const [reasonByListing, setReasonByListing] = useState<Record<number, string>>({});

  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase() || "";
    return Boolean(email && adminEmails.includes(email));
  }, [user?.email]);

  const listingsQuery = useMarketplaceAdminListings(status === "all" ? undefined : status);
  const moderate = useModerateMarketplaceListing();

  const moderateListing = async (listingId: number, action: "approve" | "block" | "reject") => {
    try {
      await moderate.mutateAsync({
        listingId,
        action,
        reason: (reasonByListing[listingId] || "").trim() || undefined,
      });
      const actionLabel = action === "approve" ? "approved" : action === "block" ? "blocked" : "rejected";
      toast.success(`Listing ${actionLabel} successfully`);
      setReasonByListing((prev) => ({ ...prev, [listingId]: "" }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Moderation update failed";
      toast.error(message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="agri-card">
        <h1 className="text-2xl font-bold text-foreground mb-2">Marketplace Moderation</h1>
        <p className="text-muted-foreground">This page is available to marketplace admins only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Marketplace Moderation</h1>
        <p className="text-muted-foreground mt-1">Approve, reject, or block listings before and after publishing.</p>
      </div>

      <div className="agri-card">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">Filter Queue</h2>
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as MarketplaceListingStatus | "all")}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {listingsQuery.isLoading &&
          Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-28 rounded-xl" />)}

        {!listingsQuery.isLoading && (listingsQuery.data?.items.length || 0) === 0 && (
          <div className="agri-card text-muted-foreground">No listings found for this status.</div>
        )}

        {listingsQuery.data?.items.map((listing) => (
          <div key={listing.id} className="agri-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">{listing.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Seller: {listing.seller_name || "Farmer"} · {listing.location || "Unknown location"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {listing.quantity} {listing.unit} · {listing.price_per_unit.toFixed(2)} per {listing.unit}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{listing.status}</span>
            </div>

            <div className="mt-3 space-y-2">
              <Label>Moderation reason (optional)</Label>
              <Input
                value={reasonByListing[listing.id] || ""}
                onChange={(e) => setReasonByListing((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                placeholder="Add context for this action"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void moderateListing(listing.id, "approve")}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => void moderateListing(listing.id, "reject")}>
                Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => void moderateListing(listing.id, "block")}>
                Block
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceModeration;
