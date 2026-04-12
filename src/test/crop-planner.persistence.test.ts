import { describe, expect, it } from "vitest";
import { getOrCreateCropId, upsertCropEntry } from "@/lib/planner-persistence";
import type { CropEntry } from "@/components/planner/MyCropsHub";

describe("crop planner persistence helpers", () => {
  it("reuses existing crop id when available", () => {
    const id = getOrCreateCropId("crop_existing", () => "crop_new");
    expect(id).toBe("crop_existing");
  });

  it("creates crop id when active id is missing", () => {
    const id = getOrCreateCropId(null, () => "crop_new");
    expect(id).toBe("crop_new");
  });

  it("creates a new crop entry when crop id is not found", () => {
    const existing: CropEntry[] = [];
    const updated = upsertCropEntry(existing, "crop_1", { selectedCrop: "wheat" }, {
      selectedCrop: "",
      startDate: "",
      hasSchedule: false,
      soilComplete: false,
      soilData: null,
    });

    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe("crop_1");
    expect(updated[0].selectedCrop).toBe("wheat");
  });

  it("updates an existing crop entry instead of duplicating", () => {
    const existing: CropEntry[] = [
      {
        id: "crop_1",
        selectedCrop: "wheat",
        startDate: "2026-04-01",
        hasSchedule: false,
        soilComplete: true,
        soilData: null,
        createdAt: "2026-04-01T00:00:00.000Z",
      },
    ];

    const updated = upsertCropEntry(existing, "crop_1", { hasSchedule: true }, {
      selectedCrop: "",
      startDate: "",
      hasSchedule: false,
      soilComplete: false,
      soilData: null,
    });

    expect(updated).toHaveLength(1);
    expect(updated[0].hasSchedule).toBe(true);
  });
});
