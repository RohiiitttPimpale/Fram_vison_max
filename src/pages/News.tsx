import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Newspaper, Tag, ExternalLink, AlertCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useContentTelemetry, useInfiniteNewsFeed, useInfiniteOffersFeed } from "@/hooks/use-news-content";
import { apiClient } from "@/lib/api";
import { mockNews, mockOffers } from "@/lib/news-mock";

const ALL_STATES_VALUE = "all";

const extractStateFromLocation = (location?: string) => {
  if (!location) {
    return "";
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return location.trim();
  }

  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

const News = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedState, setSelectedState] = useState<string>(ALL_STATES_VALUE);
  const [hasInitializedState, setHasInitializedState] = useState(false);

  const metadataQuery = useQuery({
    queryKey: ["news", "prediction-metadata"],
    queryFn: () => apiClient.getPredictionMetadata(),
    staleTime: 10 * 60 * 1000,
  });

  const stateOptions = metadataQuery.data?.states ?? [];

  useEffect(() => {
    if (hasInitializedState || !metadataQuery.isFetched) {
      return;
    }

    const defaultState = extractStateFromLocation(user?.location);
    if (defaultState && stateOptions.includes(defaultState)) {
      setSelectedState(defaultState);
    }

    setHasInitializedState(true);
  }, [hasInitializedState, metadataQuery.isFetched, stateOptions, user?.location]);
  const effectiveState = selectedState === ALL_STATES_VALUE ? undefined : selectedState;

  const newsQuery = useInfiniteNewsFeed(effectiveState);
  const allNewsQuery = useInfiniteNewsFeed();
  const offersQuery = useInfiniteOffersFeed(effectiveState);
  const allOffersQuery = useInfiniteOffersFeed();
  const telemetry = useContentTelemetry();

  const newsItems = newsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const allNewsItems = allNewsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const offerItems = offersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const allOfferItems = allOffersQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const needsNewsFallback = newsQuery.isError || (!newsQuery.isLoading && newsItems.length === 0);
  const needsOffersFallback = offersQuery.isError || (!offersQuery.isLoading && offerItems.length === 0);
  const usingFallback = (needsNewsFallback && allNewsItems.length === 0) || (needsOffersFallback && allOfferItems.length === 0);
  const displayNews = newsItems.length > 0 ? newsItems : allNewsItems.length > 0 ? allNewsItems : mockNews;
  const displayOffers = offerItems.length > 0 ? offerItems : allOfferItems.length > 0 ? allOfferItems : mockOffers;

  const trackClick = (itemId: string, itemType: "news" | "offer", source: string) => {
    telemetry.mutate({
      item_id: itemId,
      item_type: itemType,
      source,
      surface: "news",
    });
  };

  const stateList = stateOptions.length > 0 ? stateOptions : [extractStateFromLocation(user?.location)].filter(Boolean) as string[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t("news_title")}</h1>
        <p className="text-muted-foreground mt-1">{t("news_subtitle")}</p>
      </div>

      <div className="agri-card mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-primary" />
            <p className="text-sm font-medium text-foreground">{t("news_state_filter")}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t("news_state_hint")}</p>
        </div>

        <div className="w-full md:w-72">
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger>
              <SelectValue placeholder={t("news_all_states")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATES_VALUE}>{t("news_all_states")}</SelectItem>
              {stateList.map((stateName) => (
                <SelectItem key={stateName} value={stateName}>
                  {stateName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {usingFallback && (
        <div className="agri-card mb-6 border-l-4 border-l-amber-500 bg-amber-50/40">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-900">{t("news_fallback_notice")}</p>
          </div>
        </div>
      )}

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper size={18} className="text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{t("news_latest")}</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {displayNews.map((item, index) => (
            <motion.a
              href={item.url || "#"}
              target="_blank"
              rel="noreferrer"
              key={item.id}
              onClick={() => trackClick(item.id, "news", item.source)}
              className="agri-card block hover:border-primary/40 transition-colors"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div className="flex gap-3">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      {item.source} · {item.category}
                    </p>
                    <ExternalLink size={16} className="text-muted-foreground shrink-0 mt-1" />
                  </div>
                  <h3 className="font-semibold text-foreground line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">{item.summary}</p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        {newsQuery.hasNextPage && !usingFallback && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => void newsQuery.fetchNextPage()}
              disabled={newsQuery.isFetchingNextPage}
            >
              {newsQuery.isFetchingNextPage ? t("news_loading_more") : t("news_load_more")}
            </Button>
          </div>
        )}

        {!newsQuery.isLoading && newsItems.length === 0 && allNewsItems.length === 0 && !usingFallback && (
          <p className="text-sm text-muted-foreground">{t("news_empty")}</p>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Tag size={18} className="text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{t("offers_title")}</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {displayOffers.map((offer, index) => (
            <motion.a
              href={offer.url || "#"}
              target="_blank"
              rel="noreferrer"
              key={offer.id}
              onClick={() => trackClick(offer.id, "offer", offer.provider)}
              className="agri-card block hover:border-primary/40 transition-colors"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    {offer.provider} · {offer.crop}
                  </p>
                  <h3 className="font-semibold text-foreground">{offer.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{offer.description}</p>
                </div>
                {offer.discount_percent > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {offer.discount_percent}% OFF
                  </span>
                )}
              </div>
            </motion.a>
          ))}
        </div>

        {offersQuery.hasNextPage && !usingFallback && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => void offersQuery.fetchNextPage()}
              disabled={offersQuery.isFetchingNextPage}
            >
              {offersQuery.isFetchingNextPage ? t("news_loading_more") : t("news_load_more_offers")}
            </Button>
          </div>
        )}

        {!offersQuery.isLoading && offerItems.length === 0 && allOfferItems.length === 0 && !usingFallback && (
          <p className="text-sm text-muted-foreground">{t("offers_empty")}</p>
        )}
      </section>
    </div>
  );
};

export default News;
