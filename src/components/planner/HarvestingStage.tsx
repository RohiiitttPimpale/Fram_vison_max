import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { CROP_DURATIONS } from "@/lib/crop-schedules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Wheat, CheckCircle2, Clock, AlertTriangle, Scissors } from "lucide-react";

interface HarvestingStageProps {
  selectedCrop: string;
  startDate: string;
  daysSinceSowing: number;
  onHarvestComplete: () => void;
  isHarvestCompleted: boolean;
}

const HARVEST_CHECKLIST_KEYS = [
  "harvest_check_moisture",
  "harvest_check_color",
  "harvest_check_equipment",
  "harvest_check_weather",
  "harvest_check_storage",
];

const HarvestingStage = ({
  selectedCrop,
  startDate,
  daysSinceSowing,
  onHarvestComplete,
  isHarvestCompleted,
}: HarvestingStageProps) => {
  const { t } = useLanguage();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const cropDuration = CROP_DURATIONS[selectedCrop] || 120;

  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round((daysSinceSowing / cropDuration) * 100));
  }, [daysSinceSowing, cropDuration]);

  const readiness: "not_ready" | "almost_ready" | "ready" = useMemo(() => {
    if (progressPercent >= 100) return "ready";
    if (progressPercent >= 80) return "almost_ready";
    return "not_ready";
  }, [progressPercent]);

  const readinessConfig = {
    not_ready: {
      label: t("harvest_not_ready"),
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      icon: <Clock size={16} className="text-red-600" />,
    },
    almost_ready: {
      label: t("harvest_almost_ready"),
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      icon: <AlertTriangle size={16} className="text-yellow-600" />,
    },
    ready: {
      label: t("harvest_ready"),
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      icon: <CheckCircle2 size={16} className="text-green-600" />,
    },
  };

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const harvestDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + cropDuration);
    return d.toLocaleDateString();
  }, [startDate, cropDuration]);

  // Don't show if less than 50% through crop duration
  if (progressPercent < 50) return null;

  if (isHarvestCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="border-2 border-green-500/30 bg-green-50/30 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-600" />
              <div>
                <p className="font-semibold text-foreground">{t("harvest_completed")}</p>
                <p className="text-sm text-muted-foreground">{t("harvest_completed_desc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const config = readinessConfig[readiness];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 space-y-4"
    >
      {/* Harvest Ready Alert */}
      {readiness === "ready" && (
        <Alert className="border-green-500/50 bg-green-500/5">
          <Wheat size={16} className="text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-300">{t("harvest_alert_title")}</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-400">
            {t("harvest_alert_desc")}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 mb-2">
        <Scissors size={22} className="text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{t("harvest_title")}</h2>
        <Badge className={config.color}>
          {config.icon}
          <span className="ml-1">{config.label}</span>
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Readiness Indicator */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("harvest_readiness")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("harvest_crop_maturity")}</span>
                <span className="font-bold text-foreground">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("planner_day")} {daysSinceSowing}</span>
                <span>{t("harvest_expected_date")}: {harvestDate}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Harvest Guidance */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("harvest_guidance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• {t("harvest_sign_1")}</li>
              <li>• {t("harvest_sign_2")}</li>
              <li>• {t("harvest_sign_3")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Pre-Harvest Checklist */}
      {readiness !== "not_ready" && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("harvest_checklist")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {HARVEST_CHECKLIST_KEYS.map(key => (
                <div key={key} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Checkbox
                    checked={checkedItems.has(key)}
                    onCheckedChange={() => toggleCheck(key)}
                  />
                  <span className="text-sm text-foreground">{t(key)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark Harvest Complete */}
      {readiness === "ready" && (
        <Button
          onClick={onHarvestComplete}
          className="w-full sm:w-auto"
          size="lg"
        >
          <CheckCircle2 size={18} className="mr-2" />
          {t("harvest_mark_complete")}
        </Button>
      )}
    </motion.div>
  );
};

export default HarvestingStage;
