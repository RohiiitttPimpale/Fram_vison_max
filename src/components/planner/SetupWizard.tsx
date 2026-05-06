import { useMemo } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { DailyTask } from "@/lib/crop-schedules";
import { SoilData } from "@/lib/soil-recommendations";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Shovel, Sprout, Layers, AlertCircle } from "lucide-react";

interface SetupWizardProps {
  schedule: DailyTask[];
  startDate: string;
  completedTasks: Set<string>;
  getTaskId: (task: DailyTask) => string;
  toggleTask: (task: DailyTask) => void;
  soilData?: SoilData | null;
}

const SETUP_STAGES = ["planner_stage_land_prep", "planner_stage_sowing"] as const;

const STAGE_ICONS: Record<string, React.ReactNode> = {
  planner_stage_land_prep: <Shovel size={20} className="text-amber-600" />,
  planner_stage_sowing: <Sprout size={20} className="text-green-600" />,
};

const SetupWizard = ({ schedule, startDate, completedTasks, getTaskId, toggleTask, soilData }: SetupWizardProps) => {
  const { t } = useLanguage();

  const setupTasks = useMemo(() => {
    return SETUP_STAGES.map(stageKey => ({
      stageKey,
      tasks: schedule.filter(task => task.stageKey === stageKey),
    }));
  }, [schedule]);

  const stageCompletion = useMemo(() => {
    return SETUP_STAGES.map(stageKey => {
      const tasks = schedule.filter(t => t.stageKey === stageKey);
      const done = tasks.filter(t => completedTasks.has(getTaskId(t))).length;
      return { stageKey, total: tasks.length, done, complete: tasks.length > 0 && done === tasks.length };
    });
  }, [schedule, completedTasks, getTaskId]);

  const landPrepDone = stageCompletion[0]?.complete ?? false;
  const currentStep = landPrepDone ? 1 : 0;

  const formatDate = (offset: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString();
  };

  const getDateRange = (stageKey: string) => {
    const stageTasks = schedule.filter(task => task.stageKey === stageKey);
    if (stageTasks.length === 0) return null;
    
    const minDay = Math.min(...stageTasks.map(t => t.dayStart));
    const maxDay = Math.max(...stageTasks.map(t => t.dayEnd));
    
    return {
      startDate: formatDate(minDay),
      endDate: formatDate(maxDay),
      startOffset: minDay,
      endOffset: maxDay
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Info banner */}
      <div className="agri-card bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Plantation Date Timeline</h3>
            <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
              Plantation date is set to <span className="font-medium">{formatDate(0)}</span>. 
              Complete all land preparation tasks before this date, then proceed with sowing/transplanting.
            </p>
          </div>
        </div>
      </div>

      {/* Soil Data Summary */}
      {soilData && (
        <div className="agri-card bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground text-sm">{t("soil_step_title")}</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs">{t("soil_type")}</span>
              <span className="font-medium text-foreground">{t(`soil_${soilData.soilType}`)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">{t("soil_ph")}</span>
              <span className="font-medium text-foreground">{soilData.ph}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">N / P / K</span>
              <span className="font-medium text-foreground">{soilData.nitrogen} / {soilData.phosphorus} / {soilData.potassium}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">{t("soil_land_area")}</span>
              <span className="font-medium text-foreground">{soilData.landArea} {t(`soil_${soilData.landUnit}`)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="agri-card border-2 border-primary/20">
        <h2 className="text-xl font-bold text-foreground mb-1">{t("planner_setup_title")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("planner_setup_desc")}</p>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {SETUP_STAGES.map((stageKey, i) => {
            const info = stageCompletion[i];
            const isActive = i === currentStep;
            const isDone = info.complete;
            return (
              <div key={stageKey} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                  isDone ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${isActive || isDone ? "text-foreground" : "text-muted-foreground"}`}>
                  {t(stageKey)}
                </span>
                {i < SETUP_STAGES.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isDone ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage cards */}
      {setupTasks.map(({ stageKey, tasks }, stageIdx) => {
        const info = stageCompletion[stageIdx];
        const isLocked = stageIdx > currentStep;
        const isActive = stageIdx === currentStep;
        const progress = info.total > 0 ? Math.round((info.done / info.total) * 100) : 0;
        const dateRange = getDateRange(stageKey);

        return (
          <motion.div
            key={stageKey}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: isLocked ? 0.5 : 1, x: 0 }}
            transition={{ delay: stageIdx * 0.1 }}
            className={`agri-card ${isActive ? "border-2 border-primary/30 shadow-md" : ""} ${isLocked ? "pointer-events-none" : ""}`}
          >
            <div className="flex items-center gap-3 mb-3">
              {STAGE_ICONS[stageKey]}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{t(stageKey)}</h3>
                  {info.complete && <CheckCircle2 size={18} className="text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{t(`${stageKey}_desc`)}</p>
                {dateRange && (
                  <p className="text-xs font-medium text-primary mt-1">
                    {dateRange.startDate === dateRange.endDate 
                      ? `Date: ${dateRange.startDate}`
                      : `${dateRange.startDate} – ${dateRange.endDate}`
                    }
                  </p>
                )}
              </div>
            </div>

            <Progress value={progress} className="h-2 mb-3" />
            <p className="text-xs text-muted-foreground mb-3">
              {info.done}/{info.total} {t("planner_tasks_label")}
            </p>

            <div className="space-y-2">
              {tasks.map(task => {
                const id = getTaskId(task);
                const done = completedTasks.has(id);
                return (
                  <div
                    key={id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${done ? "bg-primary/10" : "bg-muted/50"}`}
                  >
                    <Checkbox checked={done} onCheckedChange={() => toggleTask(task)} />
                    <div className="flex-1">
                      <span className={`text-sm ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {t(task.taskKey)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {task.dayStart === task.dayEnd
                          ? formatDate(task.dayStart)
                          : `${formatDate(task.dayStart)} – ${formatDate(task.dayEnd)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {isLocked && (
              <p className="text-xs text-muted-foreground mt-3 italic">{t("planner_complete_previous")}</p>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default SetupWizard;
