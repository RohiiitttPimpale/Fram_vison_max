import { CROPS, CropConfig } from "./agri-data";

export interface SoilData {
  soilType: string;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  landArea: number;
  landUnit: "hectare" | "acre";
}

export interface CropRecommendation {
  crop: CropConfig;
  score: number;
  reasons: string[]; // translation keys
}

const SOIL_TYPES = ["sandy", "clay", "loamy", "silt", "peaty", "chalky"] as const;
export type SoilType = (typeof SOIL_TYPES)[number];
export { SOIL_TYPES };

export function recommendCrops(soil: SoilData): CropRecommendation[] {
  const results: CropRecommendation[] = CROPS.map((crop) => {
    let score = 50;
    const reasons: string[] = [];

    // Soil type matching
    const soilCropMap: Record<string, string[]> = {
      loamy: ["Wheat", "Maize", "Soybean", "Cotton"],
      clay: ["Rice", "Wheat", "Sugarcane"],
      sandy: ["Maize", "Soybean"],
      silt: ["Wheat", "Rice", "Sugarcane"],
      peaty: ["Rice", "Sugarcane"],
      chalky: ["Wheat", "Soybean"],
    };

    if (soilCropMap[soil.soilType]?.includes(crop.name)) {
      score += 20;
      reasons.push("soil_rec_soil_match");
    }

    // pH matching
    const [phMin, phMax] = crop.optimalPH;
    if (soil.ph >= phMin && soil.ph <= phMax) {
      score += 15;
      reasons.push("soil_rec_ph_match");
    } else {
      score -= 10;
    }

    // NPK matching
    const nRatio = soil.nitrogen / crop.optimalN;
    if (nRatio >= 0.7 && nRatio <= 1.3) {
      score += 10;
      reasons.push("soil_rec_npk_match");
    } else if (nRatio < 0.5) {
      score -= 10;
    }

    // Low nitrogen → suggest legumes (Soybean)
    if (soil.nitrogen < 40 && crop.name === "Soybean") {
      score += 15;
      reasons.push("soil_rec_low_n_legume");
    }

    // High moisture soils (clay/peaty) → Rice
    if ((soil.soilType === "clay" || soil.soilType === "peaty") && crop.name === "Rice") {
      score += 10;
      reasons.push("soil_rec_moisture_match");
    }

    return { crop, score: Math.max(0, Math.min(100, score)), reasons };
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}
