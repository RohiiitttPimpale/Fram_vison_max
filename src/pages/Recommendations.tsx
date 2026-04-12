import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CROPS, getRecommendations, Recommendation, CropConfig } from "@/lib/agri-data";
import { useLanguage } from "@/contexts/LanguageContext";
import { CROP_NAME_KEYS, CATEGORY_KEYS } from "@/lib/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Droplets, FlaskConical, Bug, Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveWeather } from "@/hooks/use-live-weather";

const iconMap = {
  droplets: Droplets,
  flask: FlaskConical,
  bug: Bug,
  coins: Coins,
};

const priorityColors = {
  high: "border-l-destructive bg-destructive/5",
  medium: "border-l-accent bg-accent/5",
  low: "border-l-muted-foreground bg-muted/50",
};

const Recommendations = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const defaultCrop = CROPS.find(c => c.name === user?.preferredCrop) || CROPS[0];
  const [crop, setCrop] = useState<CropConfig>(defaultCrop);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const { weather } = useLiveWeather();

  useEffect(() => {
    if (!weather) return;
    const n = 50 + Math.floor(Math.random() * 80);
    const p = 20 + Math.floor(Math.random() * 50);
    const k = 15 + Math.floor(Math.random() * 40);
    setRecs(getRecommendations(crop, weather, n, p, k));
  }, [crop, weather]);

  const translateDesc = (r: Recommendation) => {
    const params = { ...r.descParams };
    if (params.crop) params.crop = t(CROP_NAME_KEYS[params.crop] || params.crop);
    return t(r.descKey, params);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">{t("recommendations")}</h1>
      <p className="text-muted-foreground mb-6">{t("recommendations_page_desc")}</p>

      <div className="mb-6 max-w-xs">
        <Label className="text-sm mb-2 block">{t("crop")}</Label>
        <Select value={crop.name} onValueChange={v => setCrop(CROPS.find(c => c.name === v)!)}>
          <SelectTrigger><SelectValue>{t(CROP_NAME_KEYS[crop.name])}</SelectValue></SelectTrigger>
          <SelectContent>
            {CROPS.map(c => <SelectItem key={c.name} value={c.name}>{t(CROP_NAME_KEYS[c.name])}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {recs.map((r, i) => {
          const Icon = iconMap[r.icon as keyof typeof iconMap] || Droplets;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className={`agri-card border-l-4 ${priorityColors[r.priority]}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t(r.titleKey)}</h3>
                  <span className="text-xs text-muted-foreground capitalize">{t(r.priority)} {t("priority")} · {t(CATEGORY_KEYS[r.category])}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{translateDesc(r)}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Recommendations;
