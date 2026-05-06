import React, { useEffect, useMemo, useState } from "react";
import { BadgeIndianRupee, CalendarDays, Filter, ImagePlus, MapPin, Package2, ShoppingBag, Store, Wheat } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, MarketplaceListing, MarketplaceOrder } from "@/lib/api";
import { toast } from "sonner";

const Marketplace: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { section } = useParams();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [myOrders, setMyOrders] = useState<MarketplaceOrder[]>([]);
  const [sellerOrders, setSellerOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMine, setShowMine] = useState(false);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"crop" | "seed">("crop");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>("kg");
  const [price, setPrice] = useState<number>(1);
  const [location, setLocation] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const stats = useMemo(() => {
    const active = listings.filter((item) => item.status === "active").length;
    const sold = myListings.filter((item) => item.status === "sold").length;
    return { active, sold, total: listings.length, mine: myListings.length };
  }, [listings, myListings]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getMarketplaceListings({ limit: 50 });
      setListings(res.items || []);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    try {
      const res = await apiClient.getMyMarketplaceListings();
      setMyListings(res.items || []);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to load your listings");
    }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await apiClient.getMyMarketplaceOrders();
      setMyOrders(res.as_buyer || []);
      setSellerOrders(res.as_seller || []);
    } catch {
      setMyOrders([]);
      setSellerOrders([]);
    }
  };

  useEffect(() => {
    void fetchListings();
    void fetchMyListings();
    void fetchMyOrders();
  }, []);

  useEffect(() => {
    setShowMine(section === "sell");
  }, [section]);

  const handleUpload = async (file: File) => {
    const uploaded = await apiClient.uploadMarketplaceImage(file);
    return uploaded.image_url;
  };

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();

    try {
      let image_url = "";
      if (imageFile) {
        image_url = await handleUpload(imageFile);
      }

      await apiClient.createMarketplaceListing({
        title,
        kind,
        quantity,
        unit,
        price_per_unit: price,
        location,
        description,
        image_url: image_url || undefined,
      });

      toast.success("Listing created");
      setTitle("");
      setQuantity(1);
      setUnit("kg");
      setPrice(1);
      setLocation("");
      setDescription("");
      setImageFile(null);
      void fetchListings();
      void fetchMyListings();
      void fetchMyOrders();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to create listing");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.deleteMarketplaceListing(id);
      toast.success("Listing deleted");
      void fetchListings();
      void fetchMyListings();
      void fetchMyOrders();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to delete listing");
    }
  };

  const handleMarkSold = async (id: number) => {
    try {
      await apiClient.updateMarketplaceListing(id, { status: "sold" });
      toast.success("Marked as sold");
      void fetchListings();
      void fetchMyListings();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to mark sold");
    }
  };

  const handleBuy = async (id: number) => {
    try {
      await apiClient.buyMarketplaceListing(id);
      toast.success("Order placed. Waiting for seller confirmation.");
      void fetchListings();
      void fetchMyListings();
      void fetchMyOrders();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to complete purchase");
    }
  };



  return (
    <div className="mx-auto max-w-6xl space-y-6 px-2 py-2 md:px-0">
      <section className="agri-card overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Store size={13} /> Simple marketplace
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">Buy and sell farm produce without extra steps.</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
                A clean listing flow for farmers who want a professional marketplace that is easy to use, quick to scan, and focused on action.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[28rem]">
            <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Active</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{stats.active}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">My listings</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{stats.mine}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Sold</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{stats.sold}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">Buy</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${!showMine ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-background text-muted-foreground hover:text-foreground"}`}
          onClick={() => {
            setShowMine(false);
            navigate("/marketplace/buy");
          }}
        >
          <ShoppingBag size={15} /> Buy
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${showMine ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-background text-muted-foreground hover:text-foreground"}`}
          onClick={() => {
            setShowMine(true);
            navigate("/marketplace/sell");
          }}
        >
          <Package2 size={15} /> Sell
        </button>
      </div>

      {!showMine && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter size={15} />
            <span>Direct listings with simple buying. No inquiries, no approvals.</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading &&
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="agri-card animate-pulse space-y-3">
                  <div className="h-40 rounded-xl bg-muted" />
                  <div className="h-4 w-3/5 rounded bg-muted" />
                  <div className="h-4 w-2/5 rounded bg-muted" />
                  <div className="h-10 rounded-xl bg-muted" />
                </div>
              ))}

            {!loading && listings.length === 0 && (
              <div className="agri-card md:col-span-2 xl:col-span-3">
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Wheat size={20} />
                  </div>
                  <div className="text-lg font-semibold text-foreground">No listings yet</div>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Listings will appear here once sellers publish them. The marketplace is intentionally kept lean so buyers can scan quickly.
                  </p>
                </div>
              </div>
            )}

            {listings.map((listing) => (
              <article key={listing.id} className="agri-card overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {listing.kind === "crop" ? <Wheat size={12} /> : <Package2 size={12} />}
                      {listing.kind}
                    </div>
                    <h3 className="mt-2 truncate text-lg font-semibold text-foreground">{listing.title}</h3>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin size={14} />
                      <span>{listing.location || "Location not added"}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-muted px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <BadgeIndianRupee size={12} /> Price
                    </div>
                    <div className="text-lg font-bold text-foreground">₹ {listing.price_per_unit.toFixed(2)}</div>
                  </div>
                </div>

                {(listing.image_url || listing.primary_image_url) && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={listing.image_url || listing.primary_image_url || ""} alt={listing.title} className="h-48 w-full object-cover" />
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{listing.quantity} {listing.unit}</span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={14} /> {listing.seller_name || "Seller"}
                  </span>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => void handleBuy(listing.id)}
                    className="w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95"
                  >
                    Buy now
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {showMine && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleCreate} className="agri-card space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Create a listing</h2>
              <p className="mt-1 text-sm text-muted-foreground">Keep it short and practical. Buyers should understand the offer at a glance.</p>
            </div>

            {/* Seller verification panel removed from form; tapping Publish will open phone/verification flow when needed */}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Title</span>
                <input
                  placeholder="Fresh rice sacks"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Type</span>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as any)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="crop">Crop</option>
                  <option value="seed">Seed</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Unit</span>
                <input
                  placeholder="kg"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Quantity</span>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Price per unit</span>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Location</span>
                <input
                  placeholder="Village / market / district"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Description</span>
                <textarea
                  placeholder="Add a short description with quality, grade, or availability details."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground inline-flex items-center gap-2"><ImagePlus size={14} /> Listing photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-95"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                // keep button enabled; publishing will open verification flow when required
                disabled={false}
                className="rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Publish listing
              </button>
              <button
                type="button"
                className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setTitle("");
                  setQuantity(1);
                  setUnit("kg");
                  setPrice(1);
                  setLocation("");
                  setDescription("");
                  setImageFile(null);
                }}
              >
                Clear form
              </button>
            </div>

            {user?.seller_verification_status !== "verified" && (
              <p className="text-xs text-muted-foreground">Publishing is disabled until your seller account is verified.</p>
            )}
          </form>

          <div className="agri-card space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Your listings</h2>
              <p className="mt-1 text-sm text-muted-foreground">Simple controls for active and sold items.</p>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!loading && myListings.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                No listings yet. Publish your first item with the form.
              </div>
            )}

            <div className="space-y-3">
              {myListings.map((listing) => (
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
                        <span className="inline-flex items-center gap-1">{listing.kind === "crop" ? <Wheat size={14} /> : <Package2 size={14} />} {listing.quantity} {listing.unit}</span>
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

          <div className="agri-card space-y-3 xl:col-span-2">
            <h2 className="text-lg font-semibold text-foreground">Incoming orders (seller)</h2>
            {sellerOrders.length === 0 && <p className="text-sm text-muted-foreground">No incoming orders yet.</p>}
            {sellerOrders.map((order) => (
              <div key={`seller-${order.id}`} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{order.listing_title || "Listing"}</p>
                  <span className="text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground">{order.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Buyer: {order.buyer_name || "Buyer"} · {order.quantity} {order.unit} · ₹ {order.total_price.toFixed(2)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {order.status === "pending_confirmation" && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleUpdateOrderStatus(order.id, "confirmed", "Order confirmed")}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUpdateOrderStatus(order.id, "cancelled", "Order cancelled")}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="agri-card space-y-3 xl:col-span-2">
            <h2 className="text-lg font-semibold text-foreground">My purchase orders</h2>
            {myOrders.length === 0 && <p className="text-sm text-muted-foreground">No purchase orders yet.</p>}
            {myOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{order.listing_title || "Listing"}</p>
                  <span className="text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground">{order.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{order.quantity} {order.unit} · ₹ {order.total_price.toFixed(2)} · {order.settlement_mode}</p>
                {order.status === "confirmed" && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => void handleUpdateOrderStatus(order.id, "completed", "Order completed")}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Mark received
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;