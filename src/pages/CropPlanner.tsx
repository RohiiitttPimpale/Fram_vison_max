import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { CROP_NAME_KEYS } from "@/lib/translations";
import { CROP_SCHEDULES, CROP_DURATIONS, DailyTask } from "@/lib/crop-schedules";
import { SoilData } from "@/lib/soil-recommendations";
import { apiClient, type Crop as ApiCrop } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, RotateCcw, Sprout, ArrowLeft, Trash2 } from "lucide-react";
import SoilAnalysis from "@/components/planner/SoilAnalysis";
import SetupWizard from "@/components/planner/SetupWizard";
import CropCareDashboard from "@/components/planner/CropCareDashboard";
import HarvestingStage from "@/components/planner/HarvestingStage";
import SellingStage from "@/components/planner/SellingStage";
import MyCropsHub, { CropEntry } from "@/components/planner/MyCropsHub";
import { useLiveWeather } from "@/hooks/use-live-weather";

type PlannerView = "hub" | "detail" | "newCrop";
type PlannerPhase = "soil" | "select" | "setup" | "dashboard" | "finalStage";

// Map backend crop to frontend CropEntry format
const mapApiCropToEntry = (apiCrop: ApiCrop): CropEntry => ({
  id: apiCrop.crop_id, // Use backend crop_id as frontend id
  selectedCrop: apiCrop.selected_crop,
  startDate: apiCrop.start_date || "",
  hasSchedule: apiCrop.has_schedule,
  soilComplete: apiCrop.soil_complete,
  soilData: apiCrop.soil_data as SoilData | null,
  createdAt: apiCrop.created_at || new Date().toISOString(),
  _dbId: apiCrop.id, // Store backend DB ID for reference
});

// Map frontend CropEntry to backend API format
const mapEntryToApiCrop = (entry: CropEntry): Partial<ApiCrop> => ({
  selected_crop: entry.selectedCrop,
  start_date: entry.startDate,
  has_schedule: entry.hasSchedule,
  soil_complete: entry.soilComplete,
  soil_data: entry.soilData,
});

const generateCropId = () => `crop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const getTaskStorageKey = (cropId: string) => `agrismart_planner_tasks_${cropId}`;

const readCompletedTasks = (cropId: string): Set<string> => {
  try {
    const raw = localStorage.getItem(getTaskStorageKey(cropId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
};

const writeCompletedTasks = (cropId: string, completed: Set<string>) => {
  localStorage.setItem(getTaskStorageKey(cropId), JSON.stringify(Array.from(completed)));
};

const CropPlanner = () => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { weather } = useLiveWeather();

  // State for crops (from backend)
  const [allCrops, setAllCrops] = useState<CropEntry[]>([]);
  const [activeCropId, setActiveCropId] = useState<string | null>(null);
  const [cropsLoading, setCropsLoading] = useState(true);
  const [cropsError, setCropsError] = useState<string | null>(null);

  // UI state
  const [view, setView] = useState<PlannerView>("hub");
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [soilComplete, setSoilComplete] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [startDate, setStartDate] = useState("");
  const [schedule, setSchedule] = useState<DailyTask[] | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [isHarvestCompleted, setIsHarvestCompleted] = useState(false);

  // Load crops from backend on mount
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadCrops = async () => {
      try {
        setCropsLoading(true);
        setCropsError(null);
        const crops = await apiClient.getCrops();
        
        // Map to CropEntry format
        const entries = crops.map(mapApiCropToEntry);
        setAllCrops(entries);

        // Set initial view and active crop
        if (entries.length === 0) {
          setView("newCrop");
          setActiveCropId(null);
        } else {
          setView("hub");
          setActiveCropId(entries[entries.length - 1].id);
        }
      } catch (err) {
        setCropsError(err instanceof Error ? err.message : "Failed to load crops");
        console.error("Error loading crops:", err);
      } finally {
        setCropsLoading(false);
      }
    };

    loadCrops();
  }, [isAuthenticated, user]);

  // Active crop data
  const activeCrop = useMemo(() => {
    if (!activeCropId) return null;
    return allCrops.find(c => c.id === activeCropId) || null;
  }, [allCrops, activeCropId]);

  // Load active crop into state when switching
  const loadCropIntoState = useCallback((crop: CropEntry) => {
    setSoilData(crop.soilData);
    setSoilComplete(crop.soilComplete);
    setSelectedCrop(crop.selectedCrop);
    setStartDate(crop.startDate);
    setSchedule(crop.hasSchedule ? (CROP_SCHEDULES[crop.selectedCrop] || null) : null);
    setCompletedTasks(readCompletedTasks(crop.id));
  }, []);

  const getTaskId = useCallback((task: DailyTask) => `${task.taskKey}_${task.dayStart}`, []);

  const toggleTask = useCallback((task: DailyTask) => {
    const cropId = activeCropId;
    if (!cropId) return;

    const id = `${task.taskKey}_${task.dayStart}`;
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeCompletedTasks(cropId, next);
      return next;
    });
  }, [activeCropId]);

  // Persist crop entry changes to backend
  const updateCropEntry = useCallback(
    async (updates: Partial<CropEntry>, targetCropId?: string) => {
      const cropId = targetCropId ?? activeCropId;
      if (!cropId) return;

      try {
        const crop = allCrops.find(c => c.id === cropId);
        if (!crop || !crop._dbId) return;

        // Update backend
        const apiData = mapEntryToApiCrop({ ...crop, ...updates });
        await apiClient.updateCrop(crop._dbId, apiData);

        // Update local state
        setAllCrops(prev =>
          prev.map(c =>
            c.id === cropId
              ? {
                  ...c,
                  selectedCrop: updates.selectedCrop ?? c.selectedCrop,
                  startDate: updates.startDate ?? c.startDate,
                  hasSchedule: updates.hasSchedule ?? c.hasSchedule,
                  soilComplete: updates.soilComplete ?? c.soilComplete,
                  soilData: updates.soilData ?? c.soilData,
                }
              : c
          )
        );
      } catch (err) {
        console.error("Error updating crop:", err);
      }
    },
    [activeCropId, allCrops]
  );

  // Hub handlers
  const handleSelectCrop = useCallback((id: string) => {
    const crop = allCrops.find(c => c.id === id);
    if (!crop) return;
    setActiveCropId(id);
    loadCropIntoState(crop);
    setView("detail");
  }, [allCrops, loadCropIntoState]);

  const handleAddNewCrop = useCallback(() => {
    setActiveCropId(null);
    setSoilData(null);
    setSoilComplete(false);
    setSelectedCrop("");
    setStartDate("");
    setSchedule(null);
    setCompletedTasks(new Set());
    setView("newCrop");
  }, []);

  const handleDeleteCropById = useCallback(async (cropId: string) => {
    const crop = allCrops.find(c => c.id === cropId);
    if (!crop || !crop._dbId) return;

    try {
      await apiClient.deleteCrop(crop._dbId);
      const updated = allCrops.filter(c => c.id !== cropId);
      setAllCrops(updated);

      if (activeCropId === cropId) {
        if (updated.length > 0) {
          const latestCrop = updated[updated.length - 1];
          setActiveCropId(latestCrop.id);
          loadCropIntoState(latestCrop);
          setView("hub");
        } else {
          setActiveCropId(null);
          setSoilData(null);
          setSoilComplete(false);
          setSelectedCrop("");
          setStartDate("");
          setSchedule(null);
          setCompletedTasks(new Set());
          setView("newCrop");
        }
      }
    } catch (err) {
      console.error("Error deleting crop:", err);
    }
  }, [activeCropId, allCrops, loadCropIntoState]);

  const handleBackToHub = useCallback(() => {
    setView("hub");
  }, []);

  // Soil complete handler
  const handleSoilComplete = (data: SoilData, crop: string) => {
    setSoilData(data);
    setSelectedCrop(crop);
    setSoilComplete(true);

    if (activeCropId) {
      updateCropEntry({ soilData: data, selectedCrop: crop, soilComplete: true }, activeCropId);
    }
  };

  // Generate schedule
  const handleGenerate = async () => {
    if (selectedCrop && startDate) {
      const newSchedule = CROP_SCHEDULES[selectedCrop] || null;
      if (!newSchedule) return;

      if (activeCropId) {
        setSchedule(newSchedule);
        updateCropEntry({ startDate, hasSchedule: true }, activeCropId);
      } else {
        const newId = generateCropId();
        try {
          const newCrop = await apiClient.createCrop({
            crop_id: newId,
            selected_crop: selectedCrop,
            start_date: startDate,
            soil_complete: true,
            has_schedule: true,
            soil_data: soilData,
          });

          const entry = mapApiCropToEntry(newCrop);
          setAllCrops(prev => [...prev, entry]);
          setActiveCropId(entry.id);
          setSchedule(newSchedule);
        } catch (err) {
          console.error("Error creating crop:", err);
          return;
        }
      }

      if (view === "newCrop") setView("detail");
    }
  };

  // Reset current crop
  const handleReset = async () => {
    if (!activeCropId) {
      setSoilData(null);
      setSoilComplete(false);
      setSelectedCrop("");
      setStartDate("");
      setSchedule(null);
      setCompletedTasks(new Set());
      setView("newCrop");
      return;
    }

    await handleDeleteCropById(activeCropId);
  };

  // Phase logic
  const setupComplete = useMemo(() => {
    if (!schedule) return false;
    const setupTasks = schedule.filter(
      t => t.stageKey === "planner_stage_land_prep" || t.stageKey === "planner_stage_sowing"
    );
    return setupTasks.length > 0 && setupTasks.every(t => completedTasks.has(getTaskId(t)));
  }, [schedule, completedTasks, getTaskId]);

  const daysSinceSowing = useMemo(() => {
    if (!startDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [startDate]);

  const cropDuration = selectedCrop ? (CROP_DURATIONS[selectedCrop] || 120) : 120;

  const handleHarvestComplete = useCallback(() => {
    setIsHarvestCompleted(true);
  }, []);

  const phase: PlannerPhase = !soilComplete
    ? "soil"
    : !schedule
      ? "select"
      : !setupComplete
        ? "setup"
        : daysSinceSowing >= cropDuration
          ? "finalStage"
          : "dashboard";

  const phaseSteps = [
    { key: "soil", label: t("soil_step_title"), done: soilComplete },
    { key: "select", label: t("planner_phase_setup"), done: !!schedule && setupComplete },
    { key: "dashboard", label: t("planner_phase_crop_care"), done: phase === "finalStage" },
    { key: "finalStage", label: t("planner_phase_final"), done: false },
  ];

  // ===== RENDER =====

  if (cropsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t("loading") || "Loading..."}</p>
      </div>
    );
  }

  if (cropsError) {
    return (
      <div className="agri-card bg-destructive/10 border-destructive/20">
        <p className="text-destructive">Error: {cropsError}</p>
      </div>
    );
  }

  // Hub view: show all crops
  if (view === "hub") {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-foreground">{t("nav_planner")}</h1>
        </div>
        <p className="text-muted-foreground mb-6">{t("planner_subtitle")}</p>
        <MyCropsHub
          crops={allCrops}
          activeCropId={activeCropId}
          onSelectCrop={handleSelectCrop}
          onAddNew={handleAddNewCrop}
          onRemoveCrop={handleDeleteCropById}
        />
      </div>
    );
  }

  // Detail or newCrop view
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {allCrops.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleBackToHub}>
              <ArrowLeft size={16} className="mr-1" />
              {t("back_to_crops")}
            </Button>
          )}
          <h1 className="text-3xl font-bold text-foreground">{t("nav_planner")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddNewCrop}>
            {t("my_crops_add_new")}
          </Button>
        {(soilComplete || activeCropId) && (
          <Button variant="outline" size="sm" onClick={handleReset} className="text-destructive hover:text-destructive">
            <Trash2 size={14} className="mr-1.5" />
            Remove Crop
          </Button>
        )}
        {soilComplete && !activeCropId && (
          <Button variant="outline" size="sm" onClick={handleReset} className="text-destructive hover:text-destructive">
            <RotateCcw size={14} className="mr-1.5" />
            {t("planner_reset")}
          </Button>
        )}
        </div>
      </div>
      <p className="text-muted-foreground mb-6">{t("planner_subtitle")}</p>

      {/* Phase indicator */}
      {soilComplete && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-6 flex-wrap">
          {phaseSteps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              {i > 0 && <div className={`h-0.5 w-6 ${s.done || (phase === s.key) ? "bg-primary" : "bg-border"}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                phase === s.key ? "bg-primary text-primary-foreground" : s.done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {s.done && <CheckCircle2 size={14} />}
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {phase === "soil" && (
        <SoilAnalysis initialSoilData={soilData} onComplete={handleSoilComplete} />
      )}

      {phase === "select" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="agri-card mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sprout size={18} className="text-primary" />
              <span className="font-semibold text-foreground">{t(CROP_NAME_KEYS[selectedCrop])}</span>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSoilComplete(false)}>
                {t("soil_edit_inputs")}
              </Button>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary font-medium">💡 {t("planner_suggested_date")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{t("planner_start_date")}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleGenerate} disabled={!startDate || schedule !== null} className="w-full">
                  <Calendar size={16} className="mr-2" />
                  {t("planner_generate")}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {phase === "setup" && schedule && (
        <SetupWizard schedule={schedule} startDate={startDate} completedTasks={completedTasks} getTaskId={getTaskId} toggleTask={toggleTask} soilData={soilData} />
      )}

      {phase === "dashboard" && schedule && (
        <CropCareDashboard selectedCrop={selectedCrop} startDate={startDate} schedule={schedule} completedTasks={completedTasks} getTaskId={getTaskId} toggleTask={toggleTask} soilData={soilData} weatherData={weather} />
      )}

      {phase === "finalStage" && schedule && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <HarvestingStage
            selectedCrop={selectedCrop}
            startDate={startDate}
            daysSinceSowing={daysSinceSowing}
            onHarvestComplete={handleHarvestComplete}
            isHarvestCompleted={isHarvestCompleted}
          />
          {isHarvestCompleted && (
            <SellingStage
              selectedCrop={selectedCrop}
              startDate={startDate}
              schedule={schedule}
              completedTasks={completedTasks}
              getTaskId={getTaskId}
              isHarvestCompleted={isHarvestCompleted}
              weatherData={weather}
            />
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CropPlanner;
