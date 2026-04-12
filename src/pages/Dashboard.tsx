import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { WEATHER_CONDITION_KEYS } from "@/lib/translations";
import { WeatherData, fetchRealWeatherForState } from "@/lib/agri-data";
import { TrendingUp, Bug, Lightbulb, CalendarDays, Cloud, Thermometer, Droplets, Wind, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherState, setWeatherState] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const fetchWeather = async (showToast: boolean = false) => {
    const stateName = (user?.location || "").trim();
    if (!stateName) {
      setWeather(null);
      setWeatherState("");
      setWeatherError("Please set your location in profile to load weather");
      return;
    }

    try {
      setWeatherLoading(true);
      setWeatherError(null);

      let liveWeather: WeatherData;
      try {
        liveWeather = await fetchRealWeatherForState(stateName);
      } catch {
        // If user saved a detailed location like "Pune, Maharashtra",
        // retry with the last segment to improve geocoding accuracy.
        const parts = stateName
          .split(",")
          .map(part => part.trim())
          .filter(Boolean);
        const fallbackState = parts.length > 1 ? parts[parts.length - 1] : stateName;
        liveWeather = await fetchRealWeatherForState(fallbackState);
      }

      setWeather(liveWeather);
      setWeatherState(stateName);
      if (showToast) {
        toast.success(`Live weather updated for ${stateName}`);
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
      setWeather(null);
      setWeatherState("");
      setWeatherError("Please set your location in profile to load weather");
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
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {t("welcome")}, {user?.name?.split(" ")[0] || t("farmer")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {user?.location ? `${user.location} · ` : ""}{t("tagline")}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="agri-card mb-6 flex flex-wrap gap-6 items-center"
      >
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => void fetchWeather(true)} disabled={weatherLoading}>
            <RefreshCw size={14} className="mr-1" />
            {weatherLoading ? "Refreshing..." : "Refresh Weather"}
          </Button>
        </div>

        {weather ? (
          <>
            <div className="flex items-center gap-2">
              <Cloud size={20} className="text-primary" />
              <span className="font-semibold text-foreground">{t(WEATHER_CONDITION_KEYS[weather.condition] || weather.condition)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Thermometer size={16} /> {weather.temperature}°C
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Droplets size={16} /> {weather.humidity}% {t("humidity")}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Droplets size={16} /> {weather.rainfall}mm {t("rainfall").toLowerCase()}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wind size={16} /> {weather.windSpeed} km/h
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {weatherLoading ? "Loading live weather..." : weatherError || "Weather unavailable"}
          </p>
        )}
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((m, i) => (
          <motion.div
            key={m.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <Link to={m.to} className="block agri-card hover:border-primary/40 transition-colors group">
              <div className={`p-3 rounded-xl w-fit mb-4 ${m.color}`}>
                <m.icon size={24} />
              </div>
              <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{m.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {[
          { label: t("farm_size"), value: user?.farmSize ? `${user.farmSize} ${t("acres")}` : "—" },
          { label: t("today_temp"), value: weather ? `${weather.temperature}°C` : "—" },
          { label: t("rainfall"), value: weather ? `${weather.rainfall}mm` : "—" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="agri-card text-center"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
