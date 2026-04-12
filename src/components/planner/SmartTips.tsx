import { useMemo } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { DailyTask } from "@/lib/crop-schedules";
import { simulateWeather, CROPS, type WeatherData } from "@/lib/agri-data";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, CloudRain, Thermometer, AlertTriangle, Droplets, Bug } from "lucide-react";

interface SmartTipsProps {
  selectedCrop: string;
  startDate: string;
  schedule: DailyTask[];
  completedTasks: Set<string>;
  getTaskId: (task: DailyTask) => string;
  weatherData?: WeatherData;
}

interface Tip {
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  priority: "high" | "medium" | "low";
}

const priorityStyles: Record<string, string> = {
  high: "border-destructive/50 bg-destructive/5",
  medium: "border-yellow-500/50 bg-yellow-500/5",
  low: "border-primary/50 bg-primary/5",
};

const SmartTips = ({ selectedCrop, startDate, schedule, completedTasks, getTaskId, weatherData }: SmartTipsProps) => {
  const { t } = useLanguage();

  const tips = useMemo(() => {
    const result: Tip[] = [];
    const weather = weatherData || simulateWeather();
    const crop = CROPS.find(c => c.name === selectedCrop);
    if (!crop) return result;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const dayNum = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Current stage tasks
    const currentTasks = schedule.filter(task => dayNum >= task.dayStart && dayNum <= task.dayEnd);
    const currentStages = new Set(currentTasks.map(t => t.stageKey));

    // Weather-based tips
    if (weather.rainfall > 60 && currentStages.has("planner_stage_irrigation")) {
      result.push({
        titleKey: "tip_rain_skip_irrigation",
        descKey: "tip_rain_skip_irrigation_desc",
        icon: <CloudRain size={18} className="text-blue-500" />,
        priority: "high",
      });
    }

    if (weather.temperature > 35) {
      result.push({
        titleKey: "tip_high_temp_water",
        descKey: "tip_high_temp_water_desc",
        icon: <Thermometer size={18} className="text-destructive" />,
        priority: "high",
      });
    }

    if (weather.temperature < 10) {
      result.push({
        titleKey: "tip_low_temp_frost",
        descKey: "tip_low_temp_frost_desc",
        icon: <Thermometer size={18} className="text-blue-500" />,
        priority: "high",
      });
    }

    if (weather.humidity > 80 && (currentStages.has("planner_stage_growth") || currentStages.has("planner_stage_pest_control"))) {
      result.push({
        titleKey: "tip_high_humidity_fungal",
        descKey: "tip_high_humidity_fungal_desc",
        icon: <Bug size={18} className="text-yellow-600" />,
        priority: "medium",
      });
    }

    // Overdue task tips
    const overdueTasks = schedule.filter(task => {
      const id = getTaskId(task);
      return dayNum > task.dayEnd && !completedTasks.has(id);
    });

    if (overdueTasks.length > 0) {
      const firstOverdue = overdueTasks[0];
      if (firstOverdue.stageKey === "planner_stage_fertilization") {
        result.push({
          titleKey: "tip_fertilizer_overdue",
          descKey: "tip_fertilizer_overdue_desc",
          icon: <AlertTriangle size={18} className="text-yellow-600" />,
          priority: "high",
        });
      } else if (firstOverdue.stageKey === "planner_stage_irrigation") {
        result.push({
          titleKey: "tip_irrigation_overdue",
          descKey: "tip_irrigation_overdue_desc",
          icon: <Droplets size={18} className="text-blue-500" />,
          priority: "high",
        });
      }

      if (overdueTasks.length >= 3) {
        result.push({
          titleKey: "tip_many_overdue",
          descKey: "tip_many_overdue_desc",
          icon: <AlertTriangle size={18} className="text-destructive" />,
          priority: "high",
        });
      }
    }

    // Progress-based tips
    const progress = schedule.length > 0 ? completedTasks.size / schedule.length : 0;
    if (progress > 0.8 && !currentStages.has("planner_stage_selling")) {
      result.push({
        titleKey: "tip_almost_done",
        descKey: "tip_almost_done_desc",
        icon: <Lightbulb size={18} className="text-primary" />,
        priority: "low",
      });
    }

    if (weather.rainfall < 20 && currentStages.has("planner_stage_sowing")) {
      result.push({
        titleKey: "tip_dry_sowing",
        descKey: "tip_dry_sowing_desc",
        icon: <Droplets size={18} className="text-yellow-600" />,
        priority: "medium",
      });
    }

    return result.slice(0, 3);
  }, [selectedCrop, startDate, schedule, completedTasks, getTaskId, weatherData]);

  if (tips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={18} className="text-primary fill-primary/20" />
        <h3 className="font-semibold text-foreground">{t("planner_smart_tips")}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tips.map((tip, i) => (
          <motion.div
            key={tip.titleKey}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i }}
          >
            <Alert className={priorityStyles[tip.priority]}>
              {tip.icon}
              <AlertTitle className="text-sm font-semibold">{t(tip.titleKey)}</AlertTitle>
              <AlertDescription className="text-xs">{t(tip.descKey)}</AlertDescription>
            </Alert>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SmartTips;
