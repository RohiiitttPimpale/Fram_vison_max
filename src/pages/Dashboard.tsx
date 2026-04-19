import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { WEATHER_CONDITION_KEYS } from "@/lib/translations";
import { WeatherData, fetchRealWeather, fetchRealWeatherForState } from "@/lib/agri-data";
import { useContentTelemetry, useDashboardTopNews, useDashboardTopOffers } from "@/hooks/use-news-content";
import { TrendingUp, Bug, Lightbulb, CalendarDays, Cloud, Thermometer, Droplets, Wind, RefreshCw, Newspaper, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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

  const cleaned = parts.filter((part) => part.toLowerCase() !== "india");
  if (cleaned.length === 0) {
    return parts[0];
  }
  return cleaned.length > 1 ? cleaned[cleaned.length - 1] : cleaned[0];
};

const buildWeatherLocationCandidates = (location: string): string[] => {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [location.trim()].filter(Boolean);
  }

  const withoutCountry = parts.filter((part) => part.toLowerCase() !== "india");
  const city = withoutCountry[0] || "";
  const state = withoutCountry.length > 1 ? withoutCountry[withoutCountry.length - 1] : "";

  const candidates = [
    location.trim(),
    city && state ? `${city}, ${state}` : "",
    city,
  ].filter(Boolean);

  return Array.from(new Set(candidates));
};

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherState, setWeatherState] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const farmerState = extractStateFromLocation(user?.location);
  const effectiveState = farmerState || undefined;
  const topNewsQuery = useDashboardTopNews(effectiveState);
  const topOffersQuery = useDashboardTopOffers(effectiveState);
  const telemetry = useContentTelemetry();

  const fetchWeather = async (showToast: boolean = false) => {
    const stateName = (user?.location || "").trim();

    try {
      setWeatherLoading(true);
      setWeatherError(null);

      let liveWeather: WeatherData | null = null;

      // First preference: saved profile location so different states show different weather.
      if (stateName) {
        const candidates = buildWeatherLocationCandidates(stateName);
        for (const candidate of candidates) {
          try {
            liveWeather = await fetchRealWeatherForState(candidate);
            break;
          } catch {
            // Try the next candidate (city-level variants) before failing.
          }
        }
      }

      // Fall back to exact device coordinates only when the profile location is missing or unusable.
      if (!liveWeather && !stateName) {
        try {
          liveWeather = await fetchRealWeather();
        } catch {
          // Ignore and surface a user-friendly error below.
        }
      }

      if (!liveWeather) {
        if (!stateName) {
          throw new Error("Enable location access or set your location in profile to fetch weather");
        }
        throw new Error("Unable to fetch weather for your selected location");
      }

      setWeather(liveWeather);
      setWeatherState(stateName || "device-location");
      if (showToast) {
        const toastLocation = stateName || "your current location";
        toast.success(`Live weather updated for ${toastLocation}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch live weather";
      setWeatherError(message);
      setWeather(null);
      if (showToast) {
        toast.error(message);
      }
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    const stateName = (user?.location || "").trim();
    if (!stateName) {
      if (weatherState !== "device-location") {
        setWeather(null);
        void fetchWeather(false);
      }
      return;
    }

    // If location changed, clear old weather immediately so UI cannot show stale values.
    if (weatherState !== stateName) {
      setWeather(null);
      void fetchWeather(false);
    }
  }, [user?.location, weatherState]);

  const modules = [
    { to: "/predict", icon: TrendingUp, title: t("nav_predict"), desc: t("predict_yield_desc"), color: "bg-primary/10 text-primary" },
    { to: "/disease", icon: Bug, title: t("nav_disease"), desc: t("disease_desc"), color: "bg-destructive/10 text-destructive" },
    { to: "/recommendations", icon: Lightbulb, title: t("nav_recommendations"), desc: t("recommendations_desc"), color: "bg-accent/30 text-accent-foreground" },
    { to: "/planner", icon: CalendarDays, title: t("nav_planner"), desc: t("planner_desc"), color: "bg-secondary/30 text-secondary-foreground" },
    { to: "/news", icon: Newspaper, title: t("nav_news"), desc: t("news_dashboard_card_desc"), color: "bg-emerald-100 text-emerald-700" },
  ];

  const trackContentClick = (itemId: string, itemType: "news" | "offer", source: string) => {
    telemetry.mutate({
      item_id: itemId,
      item_type: itemType,
      source,
      surface: "dashboard",
    });
  };

  const isNewsLoading = topNewsQuery.isLoading && ((topNewsQuery.data?.items?.length) ?? 0) === 0;
  const isOffersLoading = topOffersQuery.isLoading && ((topOffersQuery.data?.items?.length) ?? 0) === 0;

  return (
    <div>
      <div className="mb-4 md:mb-8">
        <h1 className="text-[20px] md:text-3xl font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
          {t("welcome")}, {user?.name?.split(" ")[0] || t("farmer")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user?.location ? `${user.location} · ` : ""}{t("tagline")}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="agri-card mb-3 md:mb-6 flex flex-wrap items-center justify-between gap-2 md:gap-3"
      >
        {weatherLoading && !weather ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : weather ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Cloud size={14} className="text-primary" />
              <span className="font-semibold text-foreground text-[13px]">{t(WEATHER_CONDITION_KEYS[weather.condition] || weather.condition)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Thermometer size={13} /> {weather.temperature}°C
            </div>
            <div className="flex items-center gap-1">
              <Droplets size={13} /> {weather.humidity}% {t("humidity")}
            </div>
            <div className="flex items-center gap-1">
              <Droplets size={13} /> {weather.rainfall}mm {t("rainfall").toLowerCase()}
            </div>
            <div className="flex items-center gap-1">
              <Wind size={13} /> {weather.windSpeed} km/h
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            {weatherLoading ? "Loading live weather..." : weatherError || "Weather unavailable"}
          </p>
        )}

        <div className="w-full md:w-auto">
          <Button className="w-full md:w-auto" variant="outline" size="sm" onClick={() => void fetchWeather(true)} disabled={weatherLoading}>
            <RefreshCw size={14} className="mr-1" />
            {weatherLoading ? "Refreshing..." : "Refresh Weather"}
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-5">
        {modules.map((m, i) => (
          <motion.div
            key={m.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className={m.to === "/news" ? "hidden lg:block" : ""}
          >
            <Link to={m.to} className="block agri-card hover:border-primary/40 transition-colors group h-full">
              <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${m.color}`}>
                <m.icon size={20} />
              </div>
              <h2 className="text-sm md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{m.title}</h2>
              <p className="hidden md:block text-sm text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 md:gap-4 mt-3 md:mt-6 lg:grid-cols-2">
        <div className="agri-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Top 3 News{effectiveState ? ` for ${effectiveState}` : ""}</h2>
              <p className="hidden md:block text-sm text-muted-foreground">Latest relevant updates for your location</p>
            </div>
            <Link to="/news" className="text-sm text-primary hover:underline">{t("news_view_all")}</Link>
          </div>

          {isNewsLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border p-3">
                  <Skeleton className="mb-2 h-3 w-24" />
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ))}
            </div>
          )}

          {!isNewsLoading && (topNewsQuery.data?.items?.length || 0) === 0 && (
            <p className="text-sm text-muted-foreground">{t("news_empty")}</p>
          )}

          <div className="space-y-3">
            {topNewsQuery.data?.items.map((item, index) => (
              <motion.a
                key={item.id}
                href={item.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="block p-3 rounded-xl border border-border hover:border-primary/40 transition-colors"
                onClick={() => trackContentClick(item.id, "news", item.source)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="hidden md:block text-xs text-muted-foreground mb-1">{item.source}</p>
                    <p className="font-medium text-foreground">{item.title}</p>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground mt-1 shrink-0" />
                </div>
              </motion.a>
            ))}
          </div>
        </div>

        <div className="agri-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Top 3 Offers{effectiveState ? ` for ${effectiveState}` : ""}</h2>
              <p className="hidden md:block text-sm text-muted-foreground">Best current offers applicable for your location</p>
            </div>
            <Link to="/news" className="text-sm text-primary hover:underline">{t("news_view_all")}</Link>
          </div>

          {isOffersLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border p-3">
                  <Skeleton className="mb-2 h-3 w-36" />
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ))}
            </div>
          )}

          {!isOffersLoading && (topOffersQuery.data?.items?.length || 0) === 0 && (
            <p className="text-sm text-muted-foreground">{t("offers_empty")}</p>
          )}

          <div className="space-y-3">
            {topOffersQuery.data?.items.map((offer, index) => (
              <motion.a
                key={offer.id}
                href={offer.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="block p-3 rounded-xl border border-border hover:border-primary/40 transition-colors"
                onClick={() => trackContentClick(offer.id, "offer", offer.provider)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="hidden md:block text-xs text-muted-foreground mb-1">{offer.provider} · {offer.crop}</p>
                    <p className="font-medium text-foreground">{offer.title}</p>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground mt-1 shrink-0" />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
