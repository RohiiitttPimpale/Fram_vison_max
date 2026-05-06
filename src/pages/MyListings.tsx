import { useEffect, useMemo, useState } from "react";
import { BadgeIndianRupee, ImagePlus, MapPin, Package2, Store, Tractor, Wheat } from "lucide-react";
import { toast } from "sonner";
import { apiClient, type MarketplaceListing } from "@/lib/api";

const MyListings = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"crop" | "seed">("crop");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("kg");
  const [pricePerUnit, setPricePerUnit] = useState(1);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const stats = useMemo(() => {
    const active = listings.filter((item) => item.status === "active").length;
    const sold = listings.filter((item) => item.status === "sold").length;
    return { active, sold, total: listings.length };
  }, [listings]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMyMarketplaceListings();
      setListings(response.items || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load your listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadListings();
  }, []);

  const resetForm = () => {
    setTitle("");
    setKind("crop");
    setQuantity(1);
    setUnit("kg");
    setPricePerUnit(1);
    setLocation("");
    setDescription("");
    setImageFile(null);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      let image_url: string | undefined;
      if (imageFile) {
        const uploaded = await apiClient.uploadMarketplaceImage(imageFile);
        image_url = uploaded.image_url;
      }

      await apiClient.createMarketplaceListing({
        title,
        kind,
        quantity,
        unit,
        price_per_unit: pricePerUnit,
        location,
        description,
        image_url,
      });

      toast.success("Listing created");
      resetForm();
      void loadListings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create listing");
    }
  };

  const handleDelete = async (listingId: number) => {
    try {
      await apiClient.deleteMarketplaceListing(listingId);
      toast.success("Listing deleted");
      void loadListings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete listing");
    }
  };

  const handleMarkSold = async (listingId: number) => {
    try {
      await apiClient.markMarketplaceListingSold(listingId);
      toast.success("Marked sold");
      void loadListings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update listing");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-2 py-2 md:px-0">
      <section className="agri-card overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Store size={13} /> Seller workspace
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">Manage your listings in one calm, professional view.</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
                Keep your offer details tidy, add a clear photo, and mark items sold when the deal is done.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:w-[24rem]">
            <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Active</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{stats.active}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Sold</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{stats.sold}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleCreate} className="agri-card space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Create listing</h2>
            <p className="mt-1 text-sm text-muted-foreground">A single clear listing is better than a cluttered one.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-foreground">Title</span>
              <input className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Fresh wheat lot" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Type</span>
              <select className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" value={kind} onChange={(e) => setKind(e.target.value as "crop" | "seed")}>
                <option value="crop">Crop</option>
                <option value="seed">Seed</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Unit</span>
              <input className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="kg" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Quantity</span>
              <input className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" type="number" min={0.01} step="0.01" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Price per unit</span>
              <input className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" type="number" min={0.01} step="0.01" value={pricePerUnit} onChange={(e) => setPricePerUnit(Number(e.target.value))} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-foreground">Location</span>
              <input className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="District or market" value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-foreground">Description</span>
              <textarea className="min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Add quality, grade, harvest window, or any useful detail." value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-foreground inline-flex items-center gap-2"><ImagePlus size={14} /> Photo</span>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground" />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-95">Create listing</button>
            <button type="button" className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={resetForm}>Reset</button>
          </div>
        </form>

        <div className="agri-card space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Your listings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Simple controls for active and sold items.</p>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading && listings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              No listings yet. Publish your first item with the form.
            </div>
          )}

          <div className="space-y-3">
            {listings.map((listing) => (
              <article key={listing.id} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-foreground">{listing.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${listing.status === "sold" ? "bg-emerald-500/10 text-emerald-700" : "bg-primary/10 text-primary"}`}>
                        {listing.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Tractor size={14} /> {listing.quantity} {listing.unit}</span>
                      <span className="inline-flex items-center gap-1"><MapPin size={14} /> {listing.location || "No location"}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-muted px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><BadgeIndianRupee size={12} /> Price</div>
                    <div className="text-lg font-bold text-foreground">₹ {listing.price_per_unit.toFixed(2)}</div>
                  </div>
                </div>

                {(listing.image_url || listing.primary_image_url) && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={listing.image_url || listing.primary_image_url || ""} alt={listing.title} className="h-36 w-full object-cover" />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {listing.status !== "sold" && (
                    <button type="button" onClick={() => void handleMarkSold(listing.id)} className="rounded-full bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95">
                      Mark sold
                    </button>
                  )}
                  <button type="button" onClick={() => void handleDelete(listing.id)} className="rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyListings;