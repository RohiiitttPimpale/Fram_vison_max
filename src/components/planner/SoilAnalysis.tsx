import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Leaf, FlaskConical, Layers, ListFilter } from "lucide-react";
import { SoilData, SOIL_TYPES, recommendCrops, CropRecommendation } from "@/lib/soil-recommendations";
import { CROP_NAME_KEYS } from "@/lib/translations";
import { CROP_SCHEDULES } from "@/lib/crop-schedules";

interface SoilAnalysisProps {
  initialSoilData: SoilData | null;
  onComplete: (soilData: SoilData, selectedCrop: string) => void;
}

const SOIL_DATA_DEFAULTS: SoilData = {
  soilType: "",
  ph: 6.5,
  nitrogen: 80,
  phosphorus: 40,
  potassium: 40,
  landArea: 1,
  landUnit: "hectare",
};

const ALL_CROPS = Object.keys(CROP_SCHEDULES);

const SoilAnalysis = ({ initialSoilData, onComplete }: SoilAnalysisProps) => {
  const { t } = useLanguage();
  const [soilData, setSoilData] = useState<SoilData>(initialSoilData || SOIL_DATA_DEFAULTS);
  const [recommendations, setRecommendations] = useState<CropRecommendation[] | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [step, setStep] = useState<"input" | "recommend">(initialSoilData ? "recommend" : "input");
  const [showManual, setShowManual] = useState(false);

  const updateField = <K extends keyof SoilData>(key: K, value: SoilData[K]) => {
    setSoilData(prev => ({ ...prev, [key]: value }));
  };

  const handleAnalyze = () => {
    if (!soilData.soilType) return;
    const recs = recommendCrops(soilData);
    setRecommendations(recs);
    setStep("recommend");
  };

  const handleSelect = (cropName: string) => {
    setSelectedCrop(cropName);
    setShowManual(false);
  };

  const handleProceed = () => {
    if (selectedCrop) {
      onComplete(soilData, selectedCrop);
    }
  };

  return (
    <div className="space-y-6">
      {step === "input" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers size={20} className="text-primary" />
                {t("soil_step_title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("soil_step_desc")}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("soil_type")}</label>
                  <Select value={soilData.soilType} onValueChange={v => updateField("soilType", v)}>
                    <SelectTrigger><SelectValue placeholder={t("soil_type")} /></SelectTrigger>
                    <SelectContent>
                      {SOIL_TYPES.map(s => (
                        <SelectItem key={s} value={s}>{t(`soil_${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("soil_ph")}</label>
                  <Input type="number" step="0.1" min="0" max="14" value={soilData.ph} onChange={e => updateField("ph", parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("nitrogen")} (kg/ha)</label>
                  <Input type="number" min="0" value={soilData.nitrogen} onChange={e => updateField("nitrogen", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("phosphorus")} (kg/ha)</label>
                  <Input type="number" min="0" value={soilData.phosphorus} onChange={e => updateField("phosphorus", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("potassium")} (kg/ha)</label>
                  <Input type="number" min="0" value={soilData.potassium} onChange={e => updateField("potassium", parseInt(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("soil_land_area")}</label>
                  <Input type="number" min="0" step="0.1" value={soilData.landArea} onChange={e => updateField("landArea", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("soil_land_unit")}</label>
                  <Select value={soilData.landUnit} onValueChange={v => updateField("landUnit", v as "hectare" | "acre")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hectare">{t("soil_hectare")}</SelectItem>
                      <SelectItem value="acre">{t("soil_acre")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAnalyze} disabled={!soilData.soilType} className="w-full sm:w-auto">
                <FlaskConical size={16} className="mr-2" />
                {t("soil_analyze_btn")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === "recommend" && recommendations && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">{t("soil_recommendations_title")}</h3>
            <Button variant="ghost" size="sm" onClick={() => setStep("input")}>{t("soil_edit_inputs")}</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map(rec => (
              <Card
                key={rec.crop.name}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCrop === rec.crop.name
                    ? "ring-2 ring-primary border-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleSelect(rec.crop.name)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground">{t(CROP_NAME_KEYS[rec.crop.name])}</span>
                    {selectedCrop === rec.crop.name && <CheckCircle2 size={18} className="text-primary" />}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${rec.score}%` }} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{rec.score}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rec.reasons.slice(0, 2).map(r => (
                      <span key={r} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        <Leaf size={10} />{t(r)}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Manual crop selection */}
          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManual(!showManual)}
              className="text-muted-foreground mb-2"
            >
              <ListFilter size={14} className="mr-1.5" />
              {t("soil_manual_select")}
            </Button>
            {showManual && (
              <Select value={selectedCrop} onValueChange={handleSelect}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder={t("select_crop")} />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CROPS.map(name => (
                    <SelectItem key={name} value={name}>{t(CROP_NAME_KEYS[name])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button onClick={handleProceed} disabled={!selectedCrop} className="w-full sm:w-auto">
            {t("soil_proceed_btn")}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default SoilAnalysis;
