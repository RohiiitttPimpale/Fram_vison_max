import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { WeatherData, fetchRealWeatherForState } from "@/lib/agri-data";
import { apiClient, type ModelPredictionResponse } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cloud, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const FRONTEND_TO_MODEL_CROP: Record<string, string> = {
  Soybean: "Soyabean",
  Cotton: "Cotton(lint)",
};

const YieldPrediction = () => {
  const { t } = useLanguage();

  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [supportedCrops, setSupportedCrops] = useState<string[]>([]);
  const [supportedStates, setSupportedStates] = useState<string[]>([]);

  const [crop, setCrop] = useState("");
  const [state, setState] = useState("");
  const [weatherState, setWeatherState] = useState("");

  const [weather, setWeather] = useState<WeatherData | null>(null);

  const [area, setArea] = useState("10000");
  const [fertilizer, setFertilizer] = useState("150000");
  const [pesticide, setPesticide] = useState("500");
  const [nitrogen, setNitrogen] = useState("80");
  const [phosphorus, setPhosphorus] = useState("40");
  const [potassium, setPotassium] = useState("30");
  const [ph, setPh] = useState("6.5");

  const [result, setResult] = useState<ModelPredictionResponse | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoadingMetadata(true);
        const metadata = await apiClient.getPredictionMetadata();
        setSupportedCrops(metadata.crops);
        setSupportedStates(metadata.states);

        if (metadata.crops.length > 0) {
          setCrop(metadata.crops[0]);
        }
        if (metadata.states.length > 0) {
          setState(metadata.states[0]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load prediction metadata";
        toast.error(message);
      } finally {
        setLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, []);

  useEffect(() => {
    if (!state) return;
    if (weatherState && weatherState !== state) {
      setWeather(null);
      setWeatherState("");
    }
  }, [state, weatherState]);

  const cropOptions = useMemo(() => {
    return supportedCrops.map(modelCrop => ({
      modelCrop,
      uiLabel: modelCrop,
    }));
  }, [supportedCrops]);

  const fetchWeather = async () => {
    if (!state) {
      toast.error("Please select state first");
      return;
    }

    try {
      setLoadingWeather(true);
      const liveWeather = await fetchRealWeatherForState(state);
      setWeather(liveWeather);
      setWeatherState(state);
      toast.success(`Live weather updated for ${state}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch live weather";
      toast.error(message);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handlePredict = async () => {
    if (!crop || !state) {
      toast.error("Please select crop and state");
      return;
    }

    let w = weather;
    if (!w || weatherState !== state) {
      try {
        w = await fetchRealWeatherForState(state);
        setWeather(w);
        setWeatherState(state);
      } catch {
        toast.error("Please fetch weather for the selected state first");
        return;
      }
    }

    setPredicting(true);
    try {
      const mappedCrop = FRONTEND_TO_MODEL_CROP[crop] || crop;
      const prediction = await apiClient.predictYieldModel({
        crop: mappedCrop,
        state,
        area: Number(area),
        fertilizer: Number(fertilizer),
        pesticide: Number(pesticide),
        avg_temp_c: w.temperature,
        total_rainfall_mm: w.rainfall,
        avg_humidity_percent: w.humidity,
        N: Number(nitrogen),
        P: Number(phosphorus),
        K: Number(potassium),
        pH: Number(ph),
      });
      setResult(prediction);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Prediction failed";
      toast.error(message);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">{t("yield_prediction")}</h1>
      <p className="text-muted-foreground mb-8">Model-backed yield prediction using your trained Random Forest.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="agri-card space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Crop</Label>
              <Select value={crop} onValueChange={setCrop} disabled={loadingMetadata || supportedCrops.length === 0}>
                <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                <SelectContent>
                  {cropOptions.map(option => (
                    <SelectItem key={option.modelCrop} value={option.modelCrop}>{option.uiLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">State</Label>
              <Select value={state} onValueChange={setState} disabled={loadingMetadata || supportedStates.length === 0}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {supportedStates.map(item => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {weather && weatherState && weatherState !== state && (
              <p className="text-xs text-amber-600">Weather shown is for {weatherState}. Fetch again for {state}.</p>
            )}

            <div>
              <Button variant="outline" className="w-full agri-btn-press" onClick={fetchWeather}>
                <Cloud size={16} className="mr-2" />
                {loadingWeather ? "Fetching weather..." : t("use_today_weather")}
              </Button>
              {weather && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <span>Temp: {weather.temperature}°C</span>
                  <span>Humidity: {weather.humidity}%</span>
                  <span>Rainfall: {weather.rainfall}mm</span>
                  <span>Condition: {weather.condition}</span>
                </motion.div>
              )}
            </div>
          </div>

          <div className="agri-card space-y-5">
            <h3 className="font-semibold text-foreground">Model Inputs</h3>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
              <p><span className="font-medium text-foreground">Units:</span> Area (hectares), Fertilizer (kg total), Pesticide (kg total), Temperature (°C), Rainfall (mm), Humidity (%), N/P/K (training scale), pH (0-14).</p>
              <p className="mt-1"><span className="font-medium text-foreground">Output:</span> Predicted yield is in tons/hectare.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Area (hectares)</Label>
                <Input type="number" placeholder="e.g. 1" value={area} onChange={(e) => setArea(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fertilizer (kg total)</Label>
                <Input type="number" placeholder="e.g. 150" value={fertilizer} onChange={(e) => setFertilizer(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pesticide (kg total)</Label>
                <Input type="number" placeholder="e.g. 5" value={pesticide} onChange={(e) => setPesticide(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>N (training scale)</Label>
                <Input type="number" value={nitrogen} onChange={(e) => setNitrogen(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>P (training scale)</Label>
                <Input type="number" value={phosphorus} onChange={(e) => setPhosphorus(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>K (training scale)</Label>
                <Input type="number" value={potassium} onChange={(e) => setPotassium(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>pH (0-14)</Label>
              <Input type="number" step="0.1" value={ph} onChange={(e) => setPh(e.target.value)} />
            </div>

            <Button className="w-full agri-btn-press" onClick={handlePredict} disabled={predicting || loadingMetadata || loadingWeather}>
              <RefreshCw size={16} className="mr-2" />
              {predicting ? "Predicting..." : t("predict_yield_btn")}
            </Button>
          </div>
        </div>

        <div>
          {result ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="agri-card text-center">
                <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">{t("predicted_yield")}</p>
                <p className="text-6xl font-bold text-foreground">{result.predicted_yield}</p>
                <p className="text-lg text-muted-foreground mt-1">{result.unit}</p>
                <p className="text-sm text-muted-foreground mt-4">Crop: {result.model_crop} | State: {result.model_state}</p>
              </div>
            </motion.div>
          ) : (
            <div className="agri-card flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="p-4 rounded-2xl bg-muted mb-4">
                <RefreshCw size={32} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Fill model inputs and run prediction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YieldPrediction;
