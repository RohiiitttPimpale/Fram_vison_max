import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { CROP_NAME_KEYS } from "@/lib/translations";
import { CROP_DURATIONS } from "@/lib/crop-schedules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sprout, Calendar, ChevronRight } from "lucide-react";

interface CropEntry {
  id: string;
  selectedCrop: string;
  startDate: string;
  hasSchedule: boolean;
  soilComplete: boolean;
  createdAt: string;
}

interface MyCropsProps {
  crops: CropEntry[];
  activeCropId: string | null;
  onSelectCrop: (id: string) => void;
  onAddNew: () => void;
}

const MyCrops = ({ crops, activeCropId, onSelectCrop, onAddNew }: MyCropsProps) => {
  const { t } = useLanguage();

  const getDaysSince = (startDate: string) => {
    if (!startDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatus = (crop: CropEntry) => {
    if (!crop.hasSchedule) return { label: t("my_crops_status_setup"), color: "bg-muted text-muted-foreground" };
    const days = getDaysSince(crop.startDate);
    const duration = CROP_DURATIONS[crop.selectedCrop] || 120;
    if (days >= duration) return { label: t("my_crops_status_harvest"), color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
    return { label: t("my_crops_status_growing"), color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">{t("my_crops_title")}</h2>
        <Button variant="outline" size="sm" onClick={onAddNew}>
          <Plus size={14} className="mr-1.5" />
          {t("my_crops_add_new")}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {crops.map(crop => {
          const isActive = crop.id === activeCropId;
          const status = getStatus(crop);
          const days = getDaysSince(crop.startDate);
          return (
            <button
              key={crop.id}
              onClick={() => onSelectCrop(crop.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/50"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sprout size={16} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  <span className="font-medium text-foreground">
                    {t(CROP_NAME_KEYS[crop.selectedCrop] || crop.selectedCrop)}
                  </span>
                </div>
                <Badge variant="secondary" className={`text-xs ${status.color}`}>
                  {status.label}
                </Badge>
              </div>
              {crop.startDate && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar size={12} />
                  <span>{new Date(crop.startDate).toLocaleDateString()}</span>
                  <span className="mx-1">•</span>
                  <span>{t("my_crops_day")} {days}</span>
                </div>
              )}
              {isActive && (
                <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                  {t("my_crops_active")}
                  <ChevronRight size={12} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MyCrops;
