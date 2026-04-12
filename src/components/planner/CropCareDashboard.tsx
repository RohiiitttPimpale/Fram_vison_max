import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { DailyTask } from "@/lib/crop-schedules";
import { SoilData } from "@/lib/soil-recommendations";
import { simulateWeather, CROPS, predictYield, type WeatherData } from "@/lib/agri-data";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Droplets, Leaf, Bug, BarChart3, Star, CalendarDays, Activity, AlertTriangle, CheckCircle2, Clock, TrendingUp, Bell } from "lucide-react";
import SmartTips from "./SmartTips";

interface CropCareDashboardProps {
  selectedCrop: string;
  startDate: string;
  schedule: DailyTask[];
  completedTasks: Set<string>;
  getTaskId: (task: DailyTask) => string;
  toggleTask: (task: DailyTask) => void;
  soilData?: SoilData | null;
  weatherData?: WeatherData | null;
}

const ALLOWED_CARE_STAGES = [
  "planner_stage_irrigation",
  "planner_stage_fertilization",
  "planner_stage_pest_control",
  "planner_stage_growth",
];

const CARE_STAGES = [
  { key: "planner_stage_irrigation", icon: Droplets, color: "text-blue-500" },
  { key: "planner_stage_fertilization", icon: Leaf, color: "text-purple-500" },
  { key: "planner_stage_pest_control", icon: Bug, color: "text-red-500" },
  { key: "planner_stage_growth", icon: BarChart3, color: "text-emerald-500" },
];

const STAGE_COLORS: Record<string, string> = {
  planner_stage_irrigation: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  planner_stage_fertilization: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  planner_stage_pest_control: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  planner_stage_growth: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const GROWTH_PHASES = [
  { maxDay: 20, key: "phase_early_growth" },
  { maxDay: 60, key: "phase_mid_growth" },
  { maxDay: 100, key: "phase_late_growth" },
  { maxDay: Infinity, key: "phase_maturity" },
];

type HealthStatus = "good" | "moderate" | "risk";

const CropCareDashboard = ({
  selectedCrop,
  startDate,
  schedule,
  completedTasks,
  getTaskId,
  toggleTask,
  soilData,
  weatherData,
}: CropCareDashboardProps) => {
  const { t } = useLanguage();

  const effectiveWeather = useMemo(() => weatherData || simulateWeather(), [weatherData]);



  const daysSinceSowing = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [startDate]);

  const currentPhase = useMemo(() => {
    return GROWTH_PHASES.find(p => daysSinceSowing <= p.maxDay)?.key || "phase_maturity";
  }, [daysSinceSowing]);

  // Care tasks: only irrigation, fertilization, pest control, growth monitoring
  const careTasks = useMemo(() => {
    return schedule.filter(t => ALLOWED_CARE_STAGES.includes(t.stageKey));
  }, [schedule]);

  const progress = useMemo(() => {
    if (careTasks.length === 0) return 0;
    const done = careTasks.filter(t => completedTasks.has(getTaskId(t))).length;
    return Math.round((done / careTasks.length) * 100);
  }, [careTasks, completedTasks, getTaskId]);

  // Categorized tasks
  const todaysTasks = useMemo(() => {
    return careTasks.filter(task =>
      daysSinceSowing >= task.dayStart && daysSinceSowing <= task.dayEnd && !completedTasks.has(getTaskId(task))
    );
  }, [careTasks, daysSinceSowing, completedTasks, getTaskId]);

  const overdueTasks = useMemo(() => {
    return careTasks.filter(task =>
      daysSinceSowing > task.dayEnd && !completedTasks.has(getTaskId(task))
    );
  }, [careTasks, daysSinceSowing, completedTasks, getTaskId]);

  const completedCare = useMemo(() => {
    return careTasks.filter(task => completedTasks.has(getTaskId(task)));
  }, [careTasks, completedTasks, getTaskId]);

  const upcomingTasks = useMemo(() => {
    return careTasks
      .filter(task => task.dayStart > daysSinceSowing && !completedTasks.has(getTaskId(task)))
      .slice(0, 5);
  }, [careTasks, daysSinceSowing, completedTasks, getTaskId]);

  // Priority tasks: overdue first, then today's (max 3)
  const priorityTasks = useMemo(() => {
    return [...overdueTasks, ...todaysTasks].slice(0, 3);
  }, [overdueTasks, todaysTasks]);

  // Crop Health Status
  const healthStatus: HealthStatus = useMemo(() => {
    if (overdueTasks.length > 0) return "risk";
    const relevantTasks = careTasks.filter(t => daysSinceSowing >= t.dayStart);
    if (relevantTasks.length === 0) return "good";
    const doneCount = relevantTasks.filter(t => completedTasks.has(getTaskId(t))).length;
    const ratio = doneCount / relevantTasks.length;
    if (ratio >= 0.8) return "good";
    if (ratio >= 0.5) return "moderate";
    return "risk";
  }, [careTasks, completedTasks, getTaskId, overdueTasks, daysSinceSowing]);

  const healthConfig = {
    good: { label: t("health_good"), color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle2 size={16} className="text-green-600" /> },
    moderate: { label: t("health_moderate"), color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: <Clock size={16} className="text-yellow-600" /> },
    risk: { label: t("health_risk"), color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: <AlertTriangle size={16} className="text-red-600" /> },
  };

  // Yield prediction
  const yieldResult = useMemo(() => {
    const crop = CROPS.find(c => c.name === selectedCrop);
    if (!crop) return null;
    const n = soilData?.nitrogen ?? 80;
    const p = soilData?.phosphorus ?? 40;
    const k = soilData?.potassium ?? 40;
    const ph = soilData?.ph ?? 6.5;
    return predictYield(crop, effectiveWeather, n, p, k, ph);
  }, [selectedCrop, soilData, effectiveWeather]);

  // Smart alerts
  const smartAlerts = useMemo(() => {
    const alerts: { message: string; type: "destructive" | "warning" | "info" }[] = [];

    // Overdue alerts
    overdueTasks.forEach(task => {
      const daysOver = daysSinceSowing - task.dayEnd;
      alerts.push({
        message: `${t("alert_task_overdue")}: ${t(task.taskKey)} (${daysOver} ${t("days_overdue")})`,
        type: "destructive",
      });
    });

    // Irrigation-specific overdue
    const irrigationOverdue = overdueTasks.some(t => t.stageKey === "planner_stage_irrigation");
    if (irrigationOverdue) {
      alerts.push({ message: t("alert_irrigation_overdue"), type: "destructive" });
    }

    // Multiple pending
    if (todaysTasks.length >= 3) {
      alerts.push({ message: t("alert_multiple_pending"), type: "warning" });
    }

    // Weather: rain skip irrigation
    if (effectiveWeather.rainfall > 50) {
      const hasIrrigationToday = todaysTasks.some(t => t.stageKey === "planner_stage_irrigation");
      if (hasIrrigationToday) {
        alerts.push({ message: t("alert_rain_skip"), type: "info" });
      }
    }

    return alerts.slice(0, 4);
  }, [overdueTasks, todaysTasks, daysSinceSowing, t, effectiveWeather]);

  const stageProgress = useMemo(() => {
    return CARE_STAGES.map(stage => {
      const tasks = careTasks.filter(t => t.stageKey === stage.key);
      const done = tasks.filter(t => completedTasks.has(getTaskId(t))).length;
      return { ...stage, total: tasks.length, done };
    });
  }, [careTasks, completedTasks, getTaskId]);

  const formatDate = (offset: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString();
  };


  const health = healthConfig[healthStatus];

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="agri-card border-2 border-primary/20"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-foreground">{t("planner_crop_care_dashboard")}</h2>
          <Badge variant="secondary" className="text-xs">
            <Activity size={12} className="mr-1" />
            {t(currentPhase)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <CalendarDays size={20} className="mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{Math.max(0, daysSinceSowing)}</p>
            <p className="text-xs text-muted-foreground">{t("planner_days_since_sowing")}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <BarChart3 size={20} className="mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{progress}%</p>
            <p className="text-xs text-muted-foreground">{t("planner_progress")}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Star size={20} className="mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{todaysTasks.length}</p>
            <p className="text-xs text-muted-foreground">{t("planner_todays_tasks")}</p>
          </div>
          {/* Yield Prediction */}
          {yieldResult && (
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <TrendingUp size={20} className="mx-auto mb-1 text-emerald-500" />
              <p className="text-2xl font-bold text-foreground">{yieldResult.predictedYield}</p>
              <p className="text-xs text-muted-foreground">{t("estimated_yield")} ({yieldResult.unit})</p>
            </div>
          )}
          {/* Crop Health */}
          <div className={`text-center p-3 rounded-lg ${health.color}`}>
            <div className="mx-auto mb-1 flex justify-center">{health.icon}</div>
            <p className="text-sm font-bold">{health.label}</p>
            <p className="text-xs opacity-80">{t("crop_health")}</p>
          </div>
        </div>

        <Progress value={progress} className="h-3" />
      </motion.div>

      {/* Smart Alerts */}
      {smartAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} className="text-destructive" />
            <h3 className="font-semibold text-foreground">{t("smart_alerts")}</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {smartAlerts.map((alert, i) => (
              <Alert key={i} variant={alert.type === "destructive" ? "destructive" : "default"} className={
                alert.type === "warning" ? "border-yellow-500/50 bg-yellow-500/5" :
                alert.type === "info" ? "border-blue-500/50 bg-blue-500/5" : ""
              }>
                <AlertTriangle size={14} />
                <AlertDescription className="text-xs">{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        </motion.div>
      )}

      {/* Priority Tasks */}
      {priorityTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="agri-card border-2 border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="font-semibold text-foreground">{t("priority_tasks")}</h3>
          </div>
          <div className="space-y-2">
            {priorityTasks.map(task => {
              const id = getTaskId(task);
              const isOverdue = daysSinceSowing > task.dayEnd;
              return (
                <div key={id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"
                }`}>
                  <Checkbox checked={false} onCheckedChange={() => toggleTask(task)} />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{t(task.taskKey)}</span>
                    {isOverdue && (
                      <span className="block text-xs text-destructive">
                        {daysSinceSowing - task.dayEnd} {t("days_overdue")}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[task.stageKey] || "bg-muted text-muted-foreground"}`}>
                    {t(task.stageKey)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="agri-card border-2 border-destructive/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-destructive" />
            <h3 className="font-semibold text-destructive">{t("planner_overdue_tasks")}</h3>
            <Badge variant="destructive" className="text-xs ml-auto">{overdueTasks.length}</Badge>
          </div>
          <div className="space-y-2">
            {overdueTasks.map(task => {
              const id = getTaskId(task);
              return (
                <div key={id} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <Checkbox checked={false} onCheckedChange={() => toggleTask(task)} />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{t(task.taskKey)}</span>
                    <span className="block text-xs text-destructive">
                      {t("planner_due")}: {formatDate(task.dayEnd)} · {daysSinceSowing - task.dayEnd} {t("days_overdue")}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[task.stageKey] || "bg-muted text-muted-foreground"}`}>
                    {t(task.stageKey)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Today's Tasks — always visible */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="agri-card border-2 border-primary/30"
      >
        <div className="flex items-center gap-2 mb-3">
          <Star size={18} className="text-primary fill-primary" />
          <h3 className="font-semibold text-foreground">{t("planner_todays_tasks")}</h3>
          {todaysTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs ml-auto">{todaysTasks.length}</Badge>
          )}
        </div>
        {(todaysTasks || []).length > 0 ? (
          <div className="space-y-2">
            {todaysTasks.map(task => {
              const id = getTaskId(task);
              return (
                <div key={id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Checkbox checked={false} onCheckedChange={() => toggleTask(task)} />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{t(task.taskKey)}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[task.stageKey] || "bg-muted text-muted-foreground"}`}>
                    {t(task.stageKey)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("no_tasks_today")}</p>
        )}
      </motion.div>

      {/* Completed Tasks */}
      {completedCare.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="agri-card border border-primary/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">{t("planner_completed_tasks")}</h3>
            <Badge variant="secondary" className="text-xs ml-auto">{completedCare.length}</Badge>
          </div>
          <div className="space-y-2">
            {completedCare.map(task => {
              const id = getTaskId(task);
              return (
                <div key={id} className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 opacity-75">
                  <Checkbox checked={true} onCheckedChange={() => toggleTask(task)} />
                  <div className="flex-1">
                    <span className="text-sm line-through text-muted-foreground">{t(task.taskKey)}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[task.stageKey] || "bg-muted text-muted-foreground"}`}>
                    {t(task.stageKey)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Smart Tips */}
      <SmartTips
        selectedCrop={selectedCrop}
        startDate={startDate}
        schedule={schedule}
        completedTasks={completedTasks}
        getTaskId={getTaskId}
        weatherData={effectiveWeather}
      />

      {/* Care Stage Progress Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="font-semibold text-foreground mb-3">{t("planner_crop_status")}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stageProgress.map(stage => {
            const Icon = stage.icon;
            const pct = stage.total > 0 ? Math.round((stage.done / stage.total) * 100) : 0;
            return (
              <Card key={stage.key}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon size={16} className={stage.color} />
                    {t(stage.key)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Progress value={pct} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">{stage.done}/{stage.total} {t("planner_tasks_label")}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="agri-card"
        >
          <h3 className="font-semibold text-foreground mb-3">{t("planner_upcoming_tasks")}</h3>
          <div className="space-y-2">
            {upcomingTasks.map(task => {
              const id = getTaskId(task);
              return (
                <div key={id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{t(task.taskKey)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {task.dayStart === task.dayEnd
                        ? formatDate(task.dayStart)
                        : `${formatDate(task.dayStart)} – ${formatDate(task.dayEnd)}`}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[task.stageKey] || "bg-muted text-muted-foreground"}`}>
                    {t(task.stageKey)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Full Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="agri-card"
      >
        <h3 className="font-semibold text-foreground mb-3">{t("planner_daily_schedule")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-semibold text-foreground w-10">{t("planner_status")}</th>
                <th className="text-left py-2 px-3 font-semibold text-foreground">{t("planner_day")}</th>
                <th className="text-left py-2 px-3 font-semibold text-foreground">{t("planner_start_date")}</th>
                <th className="text-left py-2 px-3 font-semibold text-foreground">{t("planner_daily_schedule")}</th>
                <th className="text-left py-2 px-3 font-semibold text-foreground">{t("nav_planner")}</th>
              </tr>
            </thead>
            <tbody>
              {careTasks.map(task => {
                const id = getTaskId(task);
                const done = completedTasks.has(id);
                const isOverdue = !done && daysSinceSowing > task.dayEnd;
                return (
                  <tr
                    key={id}
                    className={`border-b border-border/50 last:border-0 transition-colors ${
                      done ? "bg-primary/5" : isOverdue ? "bg-destructive/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <td className="py-2 px-3">
                      <Checkbox checked={done} onCheckedChange={() => toggleTask(task)} />
                    </td>
                    <td className={`py-2 px-3 font-medium whitespace-nowrap ${
                      done ? "text-muted-foreground line-through" : isOverdue ? "text-destructive" : "text-foreground"
                    }`}>
                      {t("planner_day")} {task.dayStart}{task.dayStart !== task.dayEnd ? `–${task.dayEnd}` : ""}
                    </td>
                    <td className={`py-2 px-3 whitespace-nowrap ${
                      done ? "text-muted-foreground line-through" : isOverdue ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {task.dayStart === task.dayEnd
                        ? formatDate(task.dayStart)
                        : `${formatDate(task.dayStart)} – ${formatDate(task.dayEnd)}`}
                    </td>
                    <td className={`py-2 px-3 ${done ? "text-muted-foreground line-through" : isOverdue ? "text-destructive" : "text-foreground"}`}>
                      {t(task.taskKey)}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[task.stageKey] || "bg-muted text-muted-foreground"}`}>
                        {t(task.stageKey)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default CropCareDashboard;
