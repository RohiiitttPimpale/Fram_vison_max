import type { CropEntry } from "@/components/planner/MyCropsHub";
import type { SoilData } from "@/lib/soil-recommendations";

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
