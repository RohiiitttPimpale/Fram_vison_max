import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { WEATHER_CONDITION_KEYS } from "@/lib/translations";
import { TrendingUp, Bug, Lightbulb, CalendarDays, Cloud, Thermometer, Droplets, Wind, RefreshCw } from "lucide-react";
import { useLiveWeather } from "@/hooks/use-live-weather";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { weather, loading: weatherLoading, refresh } = useLiveWeather();

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

      {weather && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="agri-card mb-6 flex flex-wrap gap-6 items-center"
        >
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={weatherLoading}>
              <RefreshCw size={14} className="mr-1" />
              {weatherLoading ? "Refreshing..." : "Refresh Weather"}
            </Button>
          </div>
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
        </motion.div>
      )}

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
