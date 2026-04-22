import type { CropEntry } from "@/components/planner/MyCropsHub";
import type { SoilData } from "@/lib/soil-recommendations";
import type { CropHealthEvaluation } from "@/lib/agri-data";

export const getOrCreateCropId = (activeCropId: string | null, createId: () => string) => {
  return activeCropId ?? createId();
};

interface CropFallbackValues {
  selectedCrop: string;
  startDate: string;
  hasSchedule: boolean;
  soilComplete: boolean;
  soilData: SoilData | null;
}

export const upsertCropEntry = (
  crops: CropEntry[],
  cropId: string,
  updates: Partial<CropEntry>,
  fallback: CropFallbackValues,
) => {
  const next = [...crops];
  const idx = next.findIndex(c => c.id === cropId);

  if (idx >= 0) {
    next[idx] = { ...next[idx], ...updates };
  } else {
    next.push({
      id: cropId,
      selectedCrop: updates.selectedCrop ?? fallback.selectedCrop,
      startDate: updates.startDate ?? fallback.startDate,
      hasSchedule: updates.hasSchedule ?? fallback.hasSchedule,
      soilComplete: updates.soilComplete ?? fallback.soilComplete,
      soilData: updates.soilData ?? fallback.soilData,
      createdAt: new Date().toISOString(),
    });
  }

  return next;
};

export interface CropHealthSnapshot extends CropHealthEvaluation {
  checkedAt: string;
  contextHash: string;
}

export interface DiseaseSignalSnapshot {
  severity: "low" | "medium" | "high";
  confidence: number;
  checkedAt: string;
  disease: string;
}

const getHealthHistoryKey = (cropId: string) => `agrismart_crop_health_history_${cropId}`;
const DISEASE_SIGNAL_KEY = "agrismart_latest_disease_signal";
const getCropDiseaseSignalKey = (cropId: string) => `agrismart_latest_disease_signal_${cropId}`;

export const readCropHealthHistory = (cropId: string): CropHealthSnapshot[] => {
  try {
    const raw = localStorage.getItem(getHealthHistoryKey(cropId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is CropHealthSnapshot => {
      return (
        typeof entry?.score === "number" &&
        typeof entry?.status === "string" &&
        typeof entry?.checkedAt === "string" &&
        typeof entry?.contextHash === "string"
      );
    });
  } catch {
    return [];
  }
};

export const readLatestCropHealthSnapshot = (cropId: string): CropHealthSnapshot | null => {
  const history = readCropHealthHistory(cropId);
  if (history.length === 0) return null;
  return history[history.length - 1];
};

export const appendCropHealthSnapshot = (
  cropId: string,
  snapshot: CropHealthSnapshot,
  maxEntries: number = 40,
) => {
  const history = readCropHealthHistory(cropId);
  const latest = history[history.length - 1];
  if (latest && latest.contextHash === snapshot.contextHash) {
    return history;
  }

  const next = [...history, snapshot].slice(-maxEntries);
  localStorage.setItem(getHealthHistoryKey(cropId), JSON.stringify(next));
  return next;
};

export const saveLatestDiseaseSignal = (signal: DiseaseSignalSnapshot, cropId?: string) => {
  localStorage.setItem(DISEASE_SIGNAL_KEY, JSON.stringify(signal));
  if (cropId) {
    localStorage.setItem(getCropDiseaseSignalKey(cropId), JSON.stringify(signal));
  }
};

export const readLatestDiseaseSignal = (cropId?: string, maxAgeDays: number = 7): DiseaseSignalSnapshot | null => {
  try {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    const parseSignal = (raw: string | null): DiseaseSignalSnapshot | null => {
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DiseaseSignalSnapshot;
      if (!parsed?.checkedAt || !parsed?.severity) return null;

      const checkedAt = new Date(parsed.checkedAt);
      if (Number.isNaN(checkedAt.getTime())) return null;

      const ageMs = Date.now() - checkedAt.getTime();
      if (ageMs > maxAgeMs) return null;
      return parsed;
    };

    if (cropId) {
      const cropSignal = parseSignal(localStorage.getItem(getCropDiseaseSignalKey(cropId)));
      if (cropSignal) return cropSignal;
    }

    return parseSignal(localStorage.getItem(DISEASE_SIGNAL_KEY));
  } catch {
    return null;
  }
};
