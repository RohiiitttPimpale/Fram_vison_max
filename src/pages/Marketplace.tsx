import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgeIndianRupee,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  ListChecks,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Store,
  Tractor,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useCreateMarketplaceListing,
  useDeleteMarketplaceListing,
  useMarkListingSold,
  useMarketplaceListings,
  useMyMarketplaceInquiries,
  useMyMarketplaceListings,
  useSendMarketplaceInquiry,
  useUpdateInquiryStatus,
  useUpdateMarketplaceListing,
  useUploadMarketplaceImage,
} from "@/hooks/use-marketplace";
import type { CreateMarketplaceListingPayload, MarketplaceListing } from "@/lib/api";
import { toast } from "sonner";

const parsePage = (value: string | null): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
};

const parseKind = (value: string | null): "all" | "crop" | "seed" => {
  if (value === "crop" || value === "seed") {
    return value;
  }
  return "all";
};

type MarketplaceSection = "buy" | "sell" | "trading";
type TradingSection = "selling" | "buying";

const getMarketplaceSection = (pathname: string): MarketplaceSection => {
  if (pathname.endsWith("/sell")) {
    return "sell";
  }
  if (pathname.endsWith("/trading")) {
    return "trading";
  }
  return "buy";
};

const Marketplace = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const locationRoute = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = useMemo(() => getMarketplaceSection(locationRoute.pathname), [locationRoute.pathname]);
  const [tradingSection, setTradingSection] = useState<TradingSection>("selling");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [page, setPage] = useState(() => parsePage(searchParams.get("page")));
  const [search, setSearch] = useState(() => (searchParams.get("search") || "").trim());
  const [kind, setKind] = useState<"crop" | "seed" | "all">(() => parseKind(searchParams.get("kind")));
  const [location, setLocation] = useState(() => (searchParams.get("location") || "").trim());
  const [debouncedSearch, setDebouncedSearch] = useState(() => (searchParams.get("search") || "").trim());
  const [debouncedLocation, setDebouncedLocation] = useState(() => (searchParams.get("location") || "").trim());
  const [inquiryByListing, setInquiryByListing] = useState<Record<number, string>>({});
  const [newListingFiles, setNewListingFiles] = useState<File[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<MarketplaceListing>>({});
  const [editFiles, setEditFiles] = useState<File[]>([]);

  const [newListing, setNewListing] = useState<CreateMarketplaceListingPayload>({
    title: "",
    kind: "crop",
    quantity: 1,
    unit: "kg",
    price_per_unit: 1,
    location: "",
    description: "",
    image_urls: [],
    accepted_policy: false,
  });

  const listingsQuery = useMarketplaceListings({
    search: debouncedSearch || undefined,
    kind: kind === "all" ? undefined : kind,
    location: debouncedLocation || undefined,
    page,
    limit: 12,
  });

  const createListing = useCreateMarketplaceListing();
  const myListingsQuery = useMyMarketplaceListings();
  const inquiriesQuery = useMyMarketplaceInquiries();
  const markSold = useMarkListingSold();
  const deleteListing = useDeleteMarketplaceListing();
  const updateListing = useUpdateMarketplaceListing();
  const uploadImage = useUploadMarketplaceImage();
  const sendInquiry = useSendMarketplaceInquiry();
  const updateInquiryStatus = useUpdateInquiryStatus();

  const listings = useMemo(() => listingsQuery.data?.items || [], [listingsQuery.data]);
  const pageInfo = listingsQuery.data;
  const totalPages = useMemo(() => {
    if (!pageInfo) {
      return 1;
    }
    return Math.max(1, Math.ceil(pageInfo.total / pageInfo.limit));
  }, [pageInfo]);

  const pageWindow = useMemo(() => {
    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [page, totalPages]);

  const myListings = useMemo(() => myListingsQuery.data?.items || [], [myListingsQuery.data]);
  const activeListings = useMemo(() => myListings.filter((item) => item.status === "active"), [myListings]);
  const soldListings = useMemo(() => myListings.filter((item) => item.status === "sold"), [myListings]);
  const pendingListings = useMemo(() => myListings.filter((item) => item.status === "pending"), [myListings]);
  const sellerInquiries = useMemo(() => inquiriesQuery.data?.as_seller || [], [inquiriesQuery.data]);
  const buyerInquiries = useMemo(() => inquiriesQuery.data?.as_buyer || [], [inquiriesQuery.data]);
  const openInquiries = useMemo(() => sellerInquiries.filter((inquiry) => inquiry.status === "open").length, [sellerInquiries]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [search]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedLocation(location.trim());
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [location]);

  useEffect(() => {
    if (section !== "buy") {
      return;
    }

    const next = new URLSearchParams();

    if (debouncedSearch) {
      next.set("search", debouncedSearch);
    }
    if (kind !== "all") {
      next.set("kind", kind);
    }
    if (debouncedLocation) {
      next.set("location", debouncedLocation);
    }
    if (page > 1) {
      next.set("page", String(page));
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, kind, debouncedLocation, page, searchParams, section, setSearchParams]);

  useEffect(() => {
    if (section !== "buy") {
      return;
    }

    const nextPage = parsePage(searchParams.get("page"));
    const nextSearch = (searchParams.get("search") || "").trim();
    const nextKind = parseKind(searchParams.get("kind"));
    const nextLocation = (searchParams.get("location") || "").trim();

    if (page !== nextPage) {
      setPage(nextPage);
    }
    if (search !== nextSearch) {
      setSearch(nextSearch);
    }
    if (kind !== nextKind) {
      setKind(nextKind);
    }
    if (location !== nextLocation) {
      setLocation(nextLocation);
    }
  }, [searchParams, section, page, search, kind, location]);

  useEffect(() => {
    if (section !== "trading") {
      return;
    }
    const view = searchParams.get("view");
    if (view === "buying" || view === "selling") {
      setTradingSection(view);
    }
  }, [searchParams, section]);

  useEffect(() => {
    if (section !== "sell") {
      setShowCreateForm(false);
      return;
    }
    if (searchParams.get("action") === "create") {
      setShowCreateForm(true);
    }
  }, [searchParams, section]);

  const openGallery = (title: string, images: string[], startIndex: number = 0) => {
    if (images.length === 0) {
      return;
    }
    setGalleryTitle(title);
    setGalleryImages(images);
    setGalleryIndex(Math.max(0, Math.min(startIndex, images.length - 1)));
    setGalleryOpen(true);
  };

  const resetCreateForm = () => {
    setNewListing({
      title: "",
      kind: "crop",
      quantity: 1,
      unit: "kg",
      price_per_unit: 1,
      location: "",
      description: "",
      image_urls: [],
      accepted_policy: false,
    });
    setNewListingFiles([]);
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newListing.accepted_policy) {
      toast.error("Please accept the marketplace policy first.");
      return;
    }

    try {
      const uploadedUrls: string[] = [];
      for (const file of newListingFiles) {
        const result = await uploadImage.mutateAsync(file);
        uploadedUrls.push(result.image_url);
      }

      await createListing.mutateAsync({
        ...newListing,
        image_urls: uploadedUrls,
      });

      toast.success("Listing submitted for moderation");
      resetCreateForm();
      setShowCreateForm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create listing";
      toast.error(message);
    }
  };

  const handleInquiry = async (listingId: number) => {
    const message = (inquiryByListing[listingId] || "").trim() || t("market_buy_default_message");
    try {
      await sendInquiry.mutateAsync({ listingId, message });
      toast.success("Inquiry sent");
      setInquiryByListing((prev) => ({ ...prev, [listingId]: "" }));
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to send inquiry";
      toast.error(text);
    }
  };

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

  const openSellForm = () => {
    setShowCreateForm(true);
    navigate("/marketplace/sell?action=create");
  };

  const setTradingView = (view: TradingSection) => {
    setTradingSection(view);
    const next = new URLSearchParams(searchParams);
    next.set("view", view);
    setSearchParams(next, { replace: true });
  };

  const marketplaceSections = [
    {
      to: "/marketplace/buy",
      active: section === "buy",
      title: t("marketplace_tab_buy"),
      subtitle: t("market_buy_section_title"),
      icon: Store,
      count: `${listings.length}`,
    },
    {
      to: "/marketplace/sell",
      active: section === "sell",
      title: t("marketplace_tab_sell"),
      subtitle: t("sell_your_sale_posts"),
      icon: Tractor,
      count: `${myListings.length}`,
    },
    {
      to: "/marketplace/trading",
      active: section === "trading",
      title: t("marketplace_tab_trading"),
      subtitle: t("marketplace_trading_subtitle"),
      icon: MessageSquare,
      count: `${sellerInquiries.length + buyerInquiries.length}`,
    },
  ] as const;

  const tradingSections = [
    {
      to: "/marketplace/trading?view=selling",
      active: tradingSection === "selling",
      title: t("marketplace_my_selling"),
      subtitle: t("marketplace_selling_requests_title"),
      icon: MessageSquare,
      count: `${sellerInquiries.length}`,
    },
    {
      to: "/marketplace/trading?view=buying",
      active: tradingSection === "buying",
      title: t("marketplace_my_buying"),
      subtitle: t("marketplace_buy_requests_title"),
      icon: MessageCircle,
      count: `${buyerInquiries.length}`,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("market_buy_sell_title")}</h1>
        <p className="text-muted-foreground mt-1">{t("market_buy_sell_subtitle")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {marketplaceSections.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`agri-card group flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                item.active ? "border-primary/40 bg-primary/5" : "hover:border-primary/20"
              }`}
              aria-current={item.active ? "page" : undefined}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                  item.active
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground group-hover:border-primary/20 group-hover:text-primary"
                }`}
              >
                <Icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-foreground">{item.title}</h2>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.count}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {section === "buy" && (
        <>
          <div className="agri-card">
            <div className="flex items-center gap-2 mb-4">
              <Store size={18} className="text-primary" />
              <h2 className="font-semibold text-foreground">{t("market_buy_section_title")}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder={t("market_search_placeholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                value={kind}
                onValueChange={(value: "crop" | "seed" | "all") => {
                  setKind(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("market_kind_label")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("market_kind_all")}</SelectItem>
                  <SelectItem value="crop">{t("market_kind_crop")}</SelectItem>
                  <SelectItem value="seed">{t("market_kind_seed")}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={t("market_location_label")}
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listingsQuery.isLoading && !listingsQuery.data &&
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="agri-card space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-36 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}

            {!listingsQuery.isLoading && listings.length === 0 && (
              <div className="agri-card md:col-span-2 xl:col-span-3 text-center text-muted-foreground">
                {t("market_no_items")}
              </div>
            )}

            {listings.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="agri-card"
              >
                {(() => {
                  const listingImages = (listing.images || [])
                    .map((image) => image.image_url)
                    .filter(Boolean);
                  const primaryImage = listing.primary_image_url || listingImages[0];

                  return (
                    <>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground">{listing.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {listing.seller_name || t("farmer")} · {listing.location || t("market_location_not_set")}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">{listing.kind}</span>
                      </div>

                      {primaryImage && (
                        <img
                          src={primaryImage}
                          alt={listing.title}
                          className="mb-3 h-36 w-full rounded-xl object-cover border border-border cursor-pointer"
                          onClick={() => openGallery(listing.title, listingImages.length > 0 ? listingImages : [primaryImage], 0)}
                        />
                      )}

                      {listingImages.length > 1 && (
                        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                          {listingImages.map((img, imgIndex) => (
                            <button
                              key={`${listing.id}-${imgIndex}`}
                              type="button"
                              className="shrink-0"
                              onClick={() => openGallery(listing.title, listingImages, imgIndex)}
                              aria-label={`Open image ${imgIndex + 1}`}
                            >
                              <img
                                src={img}
                                alt={`${listing.title} ${imgIndex + 1}`}
                                className="h-14 w-20 rounded-md border border-border object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground mb-2">{listing.quantity} {listing.unit} available</p>
                      <p className="text-sm font-medium text-foreground mb-3 inline-flex items-center gap-1">
                        <BadgeIndianRupee size={14} /> {listing.price_per_unit.toFixed(2)} {t("market_per")} {listing.unit}
                      </p>

                      <Textarea
                        className="mb-2 min-h-[74px]"
                        placeholder={t("market_buy_message_placeholder")}
                        value={inquiryByListing[listing.id] || ""}
                        onChange={(e) => setInquiryByListing((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                      />

                      <Button className="w-full" onClick={() => void handleInquiry(listing.id)}>
                        <MessageCircle size={14} className="mr-1.5" />
                        {t("market_send_buy_request")}
                      </Button>
                    </>
                  );
                })()}
              </motion.div>
            ))}
          </div>

          {!listingsQuery.isLoading && listings.length > 0 && (
            <div className="agri-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {t("market_page_summary", {
                  page: String(page),
                  totalPages: String(totalPages),
                  totalItems: String(pageInfo?.total || 0),
                })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={14} className="mr-1" /> {t("market_previous")}
                </Button>

                {pageWindow[0] > 1 && (
                  <>
                    <Button
                      variant={page === 1 ? "default" : "outline"}
                      onClick={() => setPage(1)}
                      className="min-w-10"
                    >
                      1
                    </Button>
                    {pageWindow[0] > 2 && <span className="text-muted-foreground px-1">...</span>}
                  </>
                )}

                {pageWindow.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={page === pageNumber ? "default" : "outline"}
                    onClick={() => setPage(pageNumber)}
                    className="min-w-10"
                  >
                    {pageNumber}
                  </Button>
                ))}

                {pageWindow[pageWindow.length - 1] < totalPages && (
                  <>
                    {pageWindow[pageWindow.length - 1] < totalPages - 1 && (
                      <span className="text-muted-foreground px-1">...</span>
                    )}
                    <Button
                      variant={page === totalPages ? "default" : "outline"}
                      onClick={() => setPage(totalPages)}
                      className="min-w-10"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!pageInfo?.has_more}
                >
                  {t("market_next")} <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {section === "sell" && (
        <>
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Tractor size={18} className="text-primary" />
                <h2 className="font-semibold text-foreground">{t("market_sell_section_title")}</h2>
              </div>
              <Button onClick={openSellForm}>{t("marketplace_open_sell_form")}</Button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateListing} className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>{t("market_crop_name_label")}</Label>
                  <Input
                    value={newListing.title}
                    onChange={(e) => setNewListing((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={t("market_crop_name_placeholder")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("market_kind_label")}</Label>
                  <Select
                    value={newListing.kind}
                    onValueChange={(value: "crop" | "seed") => setNewListing((prev) => ({ ...prev, kind: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crop">{t("market_kind_crop")}</SelectItem>
                      <SelectItem value="seed">{t("market_kind_seed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("market_location_label")}</Label>
                  <Input
                    value={newListing.location || ""}
                    onChange={(e) => setNewListing((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder={t("market_location_placeholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("market_quantity_label")}</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={newListing.quantity}
                    onChange={(e) => setNewListing((prev) => ({ ...prev, quantity: Number(e.target.value || 0) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("market_unit_label")}</Label>
                  <Input
                    value={newListing.unit}
                    onChange={(e) => setNewListing((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder={t("market_unit_placeholder")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("market_price_per_unit_label")}</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={newListing.price_per_unit}
                    onChange={(e) => setNewListing((prev) => ({ ...prev, price_per_unit: Number(e.target.value || 0) }))}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>{t("market_description_label")}</Label>
                  <Textarea
                    value={newListing.description || ""}
                    onChange={(e) => setNewListing((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={t("market_description_placeholder")}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="inline-flex items-center gap-2">
                    <ImagePlus size={14} /> {t("market_images_label")}
                  </Label>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={(e) => setNewListingFiles(Array.from(e.target.files || []).slice(0, 5))}
                  />
                  {newListingFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("market_images_selected", { count: String(newListingFiles.length) })}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="accept-policy"
                      checked={newListing.accepted_policy}
                      onCheckedChange={(checked) =>
                        setNewListing((prev) => ({ ...prev, accepted_policy: checked === true }))
                      }
                    />
                    <Label htmlFor="accept-policy" className="text-sm leading-5">
                      {t("market_policy_accept")}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("market_policy_review_prefix")} <Link to="/marketplace/policy" className="underline text-primary">{t("market_policy_link")}</Link> {t("market_policy_and")} {" "}
                    <Link to="/marketplace/terms" className="underline text-primary">{t("market_terms_link")}</Link> {t("market_policy_review_suffix")}
                  </p>
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <Button type="submit" disabled={createListing.isPending || uploadImage.isPending}>
                    <Plus size={14} className="mr-1.5" />
                    {createListing.isPending || uploadImage.isPending ? t("market_publishing") : t("market_publish_for_sale")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    {t("sell_cancel")}
                  </Button>
                </div>
              </form>
            )}
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

            {!myListingsQuery.isLoading && myListings.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("sell_no_posts")}</p>
            )}

            <div className="space-y-3">
              {myListings.map((listing) => (
                <div key={listing.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {listing.quantity} {listing.unit} · {listing.price_per_unit.toFixed(2)} {t("market_per")} {listing.unit}
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
        </>
      )}

      {section === "trading" && (
        <>
          <div className="agri-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">{t("marketplace_tab_trading")}</h2>
                <p className="text-sm text-muted-foreground">{t("marketplace_trading_subtitle")}</p>
              </div>
              <Button variant="outline" onClick={openSellForm}>{t("marketplace_open_sell_form")}</Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {tradingSections.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                      item.active ? "border-primary/40 bg-primary/5" : "border-border bg-background hover:border-primary/20"
                    }`}
                    aria-current={item.active ? "page" : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                            item.active ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{item.count}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {tradingSection === "selling" && (
            <div className="agri-card">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={18} className="text-primary" />
                <h2 className="font-semibold text-foreground">{t("marketplace_selling_requests_title")}</h2>
              </div>

              {inquiriesQuery.isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-xl" />
                  ))}
                </div>
              )}

              {!inquiriesQuery.isLoading && sellerInquiries.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("marketplace_no_sell_requests")}</p>
              )}

              <div className="space-y-3">
                {sellerInquiries.map((inquiry) => (
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
          )}

          {tradingSection === "buying" && (
            <div className="agri-card">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={18} className="text-primary" />
                <h2 className="font-semibold text-foreground">{t("marketplace_buy_requests_title")}</h2>
              </div>

              {inquiriesQuery.isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-xl" />
                  ))}
                </div>
              )}

              {!inquiriesQuery.isLoading && buyerInquiries.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("marketplace_no_buy_requests")}</p>
              )}

              <div className="space-y-3">
                {buyerInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{inquiry.listing_title}</p>
                        <p className="text-xs text-muted-foreground mb-1">{t("sell_from")}: {inquiry.seller_name || t("farmer")}</p>
                        <p className="text-sm text-foreground">{inquiry.message}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{t("marketplace_inquiry_status")}</p>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{inquiry.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{galleryTitle || t("market_listing_images")}</DialogTitle>
          </DialogHeader>

          {galleryImages.length > 0 && (
            <div className="space-y-3">
              <img
                src={galleryImages[galleryIndex]}
                alt={`${galleryTitle} ${galleryIndex + 1}`}
                className="w-full max-h-[60vh] rounded-lg border border-border object-contain bg-muted/30"
              />

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGalleryIndex((prev) => Math.max(0, prev - 1))}
                  disabled={galleryIndex <= 0}
                >
                  <ChevronLeft size={14} className="mr-1" /> {t("market_previous")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {galleryIndex + 1} / {galleryImages.length}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGalleryIndex((prev) => Math.min(galleryImages.length - 1, prev + 1))}
                  disabled={galleryIndex >= galleryImages.length - 1}
                >
                  {t("market_next")} <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketplace;
