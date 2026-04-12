import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { CROP_NAME_KEYS } from "@/lib/translations";
import { CROP_DURATIONS, CROP_SCHEDULES, DailyTask } from "@/lib/crop-schedules";
import { SoilData } from "@/lib/soil-recommendations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sprout, Calendar, ChevronRight, AlertTriangle, Clock, CheckCircle2, Filter, Trash2 } from "lucide-react";

export interface CropEntry {
  id: string;
  selectedCrop: string;
  startDate: string;
  hasSchedule: boolean;
  soilComplete: boolean;
  soilData: SoilData | null;
  createdAt: string;
}

type CropFilter = "all" | "growing" | "ready";

interface MyCropsHubProps {
  crops: CropEntry[];
  activeCropId: string | null;
  onSelectCrop: (id: string) => void;
  onAddNew: () => void;
  onRemoveCrop: (id: string) => void;
}

const CARE_STAGES = new Set([
  "planner_stage_irrigation",
  "planner_stage_fertilization",
  "planner_stage_pest_control",
  "planner_stage_growth",
]);

const getDaysSince = (startDate: string) => {
  if (!startDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const getTasksKey = (cropId: string) => `agrismart_planner_tasks_${cropId}`;

const getAlerts = (crop: CropEntry, t: (key: string) => string): { text: string; type: "warning" | "info" | "error" }[] => {
  const alerts: { text: string; type: "warning" | "info" | "error" }[] = [];
  if (!crop.startDate || !crop.hasSchedule) return alerts;

  const days = getDaysSince(crop.startDate);
  const duration = CROP_DURATIONS[crop.selectedCrop] || 120;

  // Ready for harvest
  if (days >= duration) {
    alerts.push({ text: t("alert_ready_harvest"), type: "warning" });
    return alerts;
  }

  // Check today's and overdue tasks
  const schedule = CROP_SCHEDULES[crop.selectedCrop];
  if (!schedule) return alerts;

  const careTasks = schedule.filter(task => CARE_STAGES.has(task.stageKey));
  let completedSet: Set<string> = new Set();
  try {
    const saved = localStorage.getItem(getTasksKey(crop.id));
    if (saved) completedSet = new Set(JSON.parse(saved));
  } catch {
    // Ignore malformed task history and evaluate alerts from current schedule only.
  }

  const getTaskId = (task: DailyTask) => `${task.taskKey}_${task.dayStart}`;

  const todayTasks = careTasks.filter(task => days >= task.dayStart && days <= task.dayEnd && !completedSet.has(getTaskId(task)));
  const overdueTasks = careTasks.filter(task => days > task.dayEnd && !completedSet.has(getTaskId(task)));

  if (overdueTasks.length > 0) {
    alerts.push({ text: t("alert_task_overdue"), type: "error" });
  }
  if (todayTasks.length > 0) {
    alerts.push({ text: t("alert_task_pending"), type: "info" });
  }

  return alerts;
};

const MyCropsHub = ({ crops, activeCropId, onSelectCrop, onAddNew, onRemoveCrop }: MyCropsHubProps) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<CropFilter>("all");

  const stats = useMemo(() => {
    let growing = 0, ready = 0;
    crops.forEach(crop => {
      if (!crop.startDate) return;
      const days = getDaysSince(crop.startDate);
      const duration = CROP_DURATIONS[crop.selectedCrop] || 120;
      if (days >= duration) ready++;
      else growing++;
    });
    return { total: crops.length, growing, ready };
  }, [crops]);

  const filteredCrops = useMemo(() => {
    if (filter === "all") return crops;
    return crops.filter(crop => {
      if (!crop.startDate) return filter === "growing";
      const days = getDaysSince(crop.startDate);
      const duration = CROP_DURATIONS[crop.selectedCrop] || 120;
      if (filter === "ready") return days >= duration;
      return days < duration;
    });
  }, [crops, filter]);

  const filters: { key: CropFilter; label: string; count: number }[] = [
    { key: "all", label: t("filter_all"), count: stats.total },
    { key: "growing", label: t("my_crops_status_growing"), count: stats.growing },
    { key: "ready", label: t("my_crops_status_harvest"), count: stats.ready },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">{t("my_crops_title")}</h2>
        <Button onClick={onAddNew} size="sm">
          <Plus size={14} className="mr-1.5" />
          {t("my_crops_add_new")}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">{t("summary_total")}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.growing}</div>
          <div className="text-xs text-muted-foreground">{t("my_crops_status_growing")}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.ready}</div>
          <div className="text-xs text-muted-foreground">{t("my_crops_status_harvest")}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-muted-foreground" />
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Crop Cards */}
      {filteredCrops.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sprout size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t("no_crops_found")}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCrops.map(crop => {
            const isActive = crop.id === activeCropId;
            const days = getDaysSince(crop.startDate);
            const duration = CROP_DURATIONS[crop.selectedCrop] || 120;
            const isReady = crop.startDate && days >= duration;
            const alerts = getAlerts(crop, t);

            return (
              <div
                key={crop.id}
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
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        !crop.hasSchedule
                          ? "bg-muted text-muted-foreground"
                          : isReady
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}
                    >
                      {!crop.hasSchedule
                        ? t("my_crops_status_setup")
                        : isReady
                          ? t("my_crops_status_harvest")
                          : t("my_crops_status_growing")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onRemoveCrop(crop.id)}
                      aria-label="Remove crop"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {crop.startDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Calendar size={12} />
                    <span>{new Date(crop.startDate).toLocaleDateString()}</span>
                    <span className="mx-1">•</span>
                    <span>{t("my_crops_day")} {days}</span>
                  </div>
                )}

                {/* Alerts */}
                {alerts.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {alerts.map((alert, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 ${
                          alert.type === "error"
                            ? "bg-destructive/10 text-destructive"
                            : alert.type === "warning"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                        }`}
                      >
                        {alert.type === "error" ? <AlertTriangle size={11} /> : alert.type === "warning" ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                        {alert.text}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  {isActive && (
                    <div className="flex items-center gap-1 text-xs text-primary font-medium">
                      {t("my_crops_active")}
                      <ChevronRight size={12} />
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onSelectCrop(crop.id)}>
                    Open
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default MyCropsHub;
