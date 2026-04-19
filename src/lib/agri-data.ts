// Mock weather and crop data utilities

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: string; // internal key like "Sunny"
}

export interface CropConfig {
  name: string; // internal English name
  baseYield: number;
  optimalTemp: [number, number];
  optimalRainfall: [number, number];
  optimalN: number;
  optimalP: number;
  optimalK: number;
  optimalPH: [number, number];
}

export const CROPS: CropConfig[] = [
  { name: "Wheat", baseYield: 3.5, optimalTemp: [15, 25], optimalRainfall: [450, 650], optimalN: 120, optimalP: 60, optimalK: 40, optimalPH: [6.0, 7.5] },
  { name: "Rice", baseYield: 4.5, optimalTemp: [22, 32], optimalRainfall: [1000, 2000], optimalN: 100, optimalP: 50, optimalK: 50, optimalPH: [5.5, 6.5] },
  { name: "Cotton", baseYield: 2.0, optimalTemp: [25, 35], optimalRainfall: [500, 800], optimalN: 80, optimalP: 40, optimalK: 40, optimalPH: [6.0, 7.5] },
  { name: "Maize", baseYield: 5.0, optimalTemp: [20, 30], optimalRainfall: [500, 800], optimalN: 150, optimalP: 60, optimalK: 40, optimalPH: [5.8, 7.0] },
  { name: "Sugarcane", baseYield: 70.0, optimalTemp: [25, 38], optimalRainfall: [1500, 2500], optimalN: 200, optimalP: 80, optimalK: 80, optimalPH: [6.0, 7.5] },
  { name: "Soybean", baseYield: 2.5, optimalTemp: [20, 30], optimalRainfall: [450, 700], optimalN: 20, optimalP: 60, optimalK: 40, optimalPH: [6.0, 7.0] },
];

export function simulateWeather(): WeatherData {
  const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Rainy"];
  return {
    temperature: Math.round(20 + Math.random() * 18),
    humidity: Math.round(40 + Math.random() * 45),
    rainfall: Math.round(Math.random() * 120),
    windSpeed: Math.round(5 + Math.random() * 20),
    condition: conditions[Math.floor(Math.random() * conditions.length)],
  };
}

function weatherCodeToCondition(code: number, cloudCover?: number): string {
  if ([51, 53, 55, 56, 57, 61, 63, 80].includes(code)) return "Light Rain";
  if ([65, 66, 67, 81, 82, 95, 96, 99].includes(code)) return "Rainy";

  if (code === 0) return "Sunny";

  // Use cloud cover when available to avoid overly broad cloudy labels.
  if (typeof cloudCover === "number") {
    if (cloudCover <= 25) return "Sunny";
    if (cloudCover <= 65) return "Partly Cloudy";
    return "Cloudy";
  }

  if ([1, 2].includes(code)) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  return "Cloudy";
}

function normalizeStateName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const STATE_COORDINATES: Record<string, { lat: number; lon: number }> = {
  [normalizeStateName("Andhra Pradesh")]: { lat: 16.5062, lon: 80.648 },
  [normalizeStateName("Arunachal Pradesh")]: { lat: 27.0844, lon: 93.6053 },
  [normalizeStateName("Assam")]: { lat: 26.1445, lon: 91.7362 },
  [normalizeStateName("Bihar")]: { lat: 25.5941, lon: 85.1376 },
  [normalizeStateName("Chhattisgarh")]: { lat: 21.2514, lon: 81.6296 },
  [normalizeStateName("Delhi")]: { lat: 28.6139, lon: 77.209 },
  [normalizeStateName("Goa")]: { lat: 15.4909, lon: 73.8278 },
  [normalizeStateName("Gujarat")]: { lat: 23.2156, lon: 72.6369 },
  [normalizeStateName("Haryana")]: { lat: 30.7333, lon: 76.7794 },
  [normalizeStateName("Himachal Pradesh")]: { lat: 31.1048, lon: 77.1734 },
  [normalizeStateName("Jammu and Kashmir")]: { lat: 34.0837, lon: 74.7973 },
  [normalizeStateName("Jharkhand")]: { lat: 23.3441, lon: 85.3096 },
  [normalizeStateName("Karnataka")]: { lat: 12.9716, lon: 77.5946 },
  [normalizeStateName("Kerala")]: { lat: 8.5241, lon: 76.9366 },
  [normalizeStateName("Madhya Pradesh")]: { lat: 23.2599, lon: 77.4126 },
  [normalizeStateName("Maharashtra")]: { lat: 19.076, lon: 72.8777 },
  [normalizeStateName("Manipur")]: { lat: 24.817, lon: 93.9368 },
  [normalizeStateName("Meghalaya")]: { lat: 25.5788, lon: 91.8933 },
  [normalizeStateName("Mizoram")]: { lat: 23.7271, lon: 92.7176 },
  [normalizeStateName("Nagaland")]: { lat: 25.6751, lon: 94.1086 },
  [normalizeStateName("Odisha")]: { lat: 20.2961, lon: 85.8245 },
  [normalizeStateName("Puducherry")]: { lat: 11.9416, lon: 79.8083 },
  [normalizeStateName("Punjab")]: { lat: 30.7333, lon: 76.7794 },
  [normalizeStateName("Sikkim")]: { lat: 27.3389, lon: 88.6065 },
  [normalizeStateName("Tamil Nadu")]: { lat: 13.0827, lon: 80.2707 },
  [normalizeStateName("Telangana")]: { lat: 17.385, lon: 78.4867 },
  [normalizeStateName("Tripura")]: { lat: 23.8315, lon: 91.2868 },
  [normalizeStateName("Uttar Pradesh")]: { lat: 26.8467, lon: 80.9462 },
  [normalizeStateName("Uttarakhand")]: { lat: 30.3165, lon: 78.0322 },
  [normalizeStateName("West Bengal")]: { lat: 22.5726, lon: 88.3639 },
  [normalizeStateName("Orissa")]: { lat: 20.2961, lon: 85.8245 },
  [normalizeStateName("NCT of Delhi")]: { lat: 28.6139, lon: 77.209 },
};

async function fetchWeatherByCoordinates(latitude: number, longitude: number): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,cloud_cover");
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Unable to fetch live weather data");
  }

  const data = await response.json();
  const current = data?.current;
  const dailyRainfall = data?.daily?.precipitation_sum?.[0];

  if (!current) {
    throw new Error("Live weather response is incomplete");
  }

  return {
    temperature: Math.round(Number(current.temperature_2m) || 0),
    humidity: Math.round(Number(current.relative_humidity_2m) || 0),
    rainfall: Math.round(Number(dailyRainfall) || 0),
    windSpeed: Math.round(Number(current.wind_speed_10m) || 0),
    condition: weatherCodeToCondition(
      Number(current.weather_code) || 3,
      typeof current.cloud_cover === "number" ? Number(current.cloud_cover) : undefined,
    ),
  };
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

export async function fetchRealWeather(): Promise<WeatherData> {
  const position = await getCurrentPosition();
  return fetchWeatherByCoordinates(position.coords.latitude, position.coords.longitude);
}

export async function fetchRealWeatherForState(stateName: string): Promise<WeatherData> {
  const cleanedState = stateName.trim().replace(/,?\s*india\s*$/i, "");
  const normalizedState = normalizeStateName(cleanedState);
  const mapped = STATE_COORDINATES[normalizedState];
  if (mapped) {
    return fetchWeatherByCoordinates(mapped.lat, mapped.lon);
  }

  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  const geocodeQuery = /\bindia\b/i.test(stateName) ? stateName : `${stateName}, India`;
  geocodeUrl.searchParams.set("name", geocodeQuery);
  geocodeUrl.searchParams.set("countryCode", "IN");
  geocodeUrl.searchParams.set("count", "1");
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("format", "json");

  const response = await fetch(geocodeUrl.toString());
  if (!response.ok) {
    throw new Error("Unable to resolve state location for weather");
  }

  const data = await response.json();
  const first = data?.results?.[0];
  if (!first || typeof first.latitude !== "number" || typeof first.longitude !== "number") {
    throw new Error(`No weather location found for selected state: ${stateName}`);
  }

  return fetchWeatherByCoordinates(first.latitude, first.longitude);
}

export interface YieldFactor {
  labelKey: string; // translation key
  val: string; // value to interpolate into the key
  impact: number;
  direction: "up" | "down";
}

export interface YieldResult {
  predictedYield: number;
  confidence: number;
  factors: YieldFactor[];
  unit: string;
}

export function predictYield(
  crop: CropConfig,
  weather: WeatherData,
  nitrogen: number,
  phosphorus: number,
  potassium: number,
  ph: number
): YieldResult {
  const factors: YieldFactor[] = [];

  // Temperature factor
  const [tMin, tMax] = crop.optimalTemp;
  let tempFactor = 1;
  if (weather.temperature < tMin) {
    tempFactor = 0.7 + 0.3 * (weather.temperature / tMin);
    factors.push({ labelKey: "factor_low_temp", val: String(weather.temperature), impact: Math.round((1 - tempFactor) * -100), direction: "down" });
  } else if (weather.temperature > tMax) {
    tempFactor = Math.max(0.5, 1 - (weather.temperature - tMax) * 0.04);
    factors.push({ labelKey: "factor_high_temp", val: String(weather.temperature), impact: Math.round((1 - tempFactor) * -100), direction: "down" });
  } else {
    factors.push({ labelKey: "factor_optimal_temp", val: String(weather.temperature), impact: 0, direction: "up" });
  }

  // Rainfall factor
  const [rMin, rMax] = crop.optimalRainfall;
  const annualizedRain = weather.rainfall * 12;
  let rainFactor = 1;
  if (annualizedRain < rMin) {
    rainFactor = 0.6 + 0.4 * (annualizedRain / rMin);
    factors.push({ labelKey: "factor_low_rainfall", val: "", impact: Math.round((1 - rainFactor) * -100), direction: "down" });
  } else if (annualizedRain > rMax) {
    rainFactor = Math.max(0.5, 1 - (annualizedRain - rMax) / rMax * 0.5);
    factors.push({ labelKey: "factor_excess_rainfall", val: "", impact: Math.round((1 - rainFactor) * -100), direction: "down" });
  } else {
    factors.push({ labelKey: "factor_adequate_rainfall", val: "", impact: 5, direction: "up" });
  }

  // NPK factors
  const nRatio = Math.min(nitrogen / crop.optimalN, 1.3);
  const nFactor = nRatio > 1 ? 1 + (nRatio - 1) * 0.3 : 0.5 + nRatio * 0.5;
  if (nRatio < 0.7) factors.push({ labelKey: "factor_low_nitrogen", val: String(nitrogen), impact: Math.round((nFactor - 1) * 100), direction: "down" });
  else if (nRatio > 1.1) factors.push({ labelKey: "factor_high_nitrogen", val: String(nitrogen), impact: Math.round((nFactor - 1) * 100), direction: "up" });
  else factors.push({ labelKey: "factor_good_nitrogen", val: String(nitrogen), impact: Math.round((nFactor - 1) * 100), direction: "up" });

  const pRatio = Math.min(phosphorus / crop.optimalP, 1.3);
  const pFactor = pRatio > 1 ? 1 + (pRatio - 1) * 0.2 : 0.6 + pRatio * 0.4;

  const kRatio = Math.min(potassium / crop.optimalK, 1.3);
  const kFactor = kRatio > 1 ? 1 + (kRatio - 1) * 0.2 : 0.6 + kRatio * 0.4;

  // pH factor
  const [phMin, phMax] = crop.optimalPH;
  let phFactor = 1;
  if (ph < phMin || ph > phMax) {
    phFactor = 0.8;
    factors.push({ labelKey: "factor_suboptimal_ph", val: String(ph), impact: -20, direction: "down" });
  }

  const predicted = crop.baseYield * tempFactor * rainFactor * nFactor * pFactor * kFactor * phFactor;
  const dataPoints = [nitrogen, phosphorus, potassium, ph, weather.temperature, weather.humidity].filter(v => v > 0).length;
  const confidence = Math.min(0.95, 0.65 + dataPoints * 0.05);

  return {
    predictedYield: Math.round(predicted * 100) / 100,
    confidence: Math.round(confidence * 100),
    factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    unit: "t/ha",
  };
}

export interface Recommendation {
  category: "irrigation" | "fertilizer" | "pest" | "cost";
  titleKey: string;
  descKey: string;
  descParams: Record<string, string>;
  priority: "high" | "medium" | "low";
  icon: string;
}

export function getRecommendations(crop: CropConfig, weather: WeatherData, n: number, p: number, k: number): Recommendation[] {
  const recs: Recommendation[] = [];

  if (weather.temperature > 32) {
    recs.push({ category: "irrigation", titleKey: "rec_increase_irrigation", descKey: "rec_increase_irrigation_desc", descParams: { temp: String(weather.temperature), crop: crop.name }, priority: "high", icon: "droplets" });
  }
  if (weather.humidity > 80) {
    recs.push({ category: "pest", titleKey: "rec_monitor_fungal", descKey: "rec_monitor_fungal_desc", descParams: { humidity: String(weather.humidity) }, priority: "high", icon: "bug" });
  }
  if (n < crop.optimalN * 0.7) {
    const deficit = Math.round((crop.optimalN - n) * 0.5);
    recs.push({ category: "fertilizer", titleKey: "rec_apply_nitrogen", descKey: "rec_apply_nitrogen_desc", descParams: { deficit: String(deficit), n: String(n), optimal: String(crop.optimalN) }, priority: "high", icon: "flask" });
  }
  if (p < crop.optimalP * 0.7) {
    recs.push({ category: "fertilizer", titleKey: "rec_add_phosphorus", descKey: "rec_add_phosphorus_desc", descParams: { p: String(p), optimal: String(crop.optimalP), crop: crop.name }, priority: "medium", icon: "flask" });
  }
  if (k < crop.optimalK * 0.7) {
    recs.push({ category: "fertilizer", titleKey: "rec_add_potassium", descKey: "rec_add_potassium_desc", descParams: { k: String(k), optimal: String(crop.optimalK), crop: crop.name }, priority: "medium", icon: "flask" });
  }
  if (weather.rainfall < 30) {
    recs.push({ category: "irrigation", titleKey: "rec_drought_alert", descKey: "rec_drought_alert_desc", descParams: { rainfall: String(weather.rainfall) }, priority: "high", icon: "droplets" });
  }
  recs.push({ category: "cost", titleKey: "rec_drip_irrigation", descKey: "rec_drip_irrigation_desc", descParams: { crop: crop.name }, priority: "low", icon: "coins" });
  recs.push({ category: "cost", titleKey: "rec_soil_test", descKey: "rec_soil_test_desc", descParams: {}, priority: "low", icon: "coins" });

  return recs;
}
