import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Upload, AlertTriangle, CheckCircle, Leaf } from "lucide-react";

interface DiagnosisResult {
  diseaseKey: string;
  descKey: string;
  treatmentKey: string;
  confidence: number;
  severity: "low" | "medium" | "high";
}

const MOCK_DISEASES: DiagnosisResult[] = [
  { diseaseKey: "disease_leaf_blight", descKey: "disease_leaf_blight_desc", treatmentKey: "disease_leaf_blight_treatment", confidence: 87, severity: "high" },
  { diseaseKey: "disease_powdery_mildew", descKey: "disease_powdery_mildew_desc", treatmentKey: "disease_powdery_mildew_treatment", confidence: 82, severity: "medium" },
  { diseaseKey: "disease_rust", descKey: "disease_rust_desc", treatmentKey: "disease_rust_treatment", confidence: 79, severity: "medium" },
  { diseaseKey: "disease_bacterial_wilt", descKey: "disease_bacterial_wilt_desc", treatmentKey: "disease_bacterial_wilt_treatment", confidence: 91, severity: "high" },
];

const DiseaseDetection = () => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const { t } = useLanguage();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const analyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setResult(MOCK_DISEASES[Math.floor(Math.random() * MOCK_DISEASES.length)]);
      setAnalyzing(false);
    }, 1500);
  };

  const reset = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">{t("disease_detection")}</h1>
      <p className="text-muted-foreground mb-8">{t("disease_detection_desc")}</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="agri-card">
            {!image ? (
              <label className="flex flex-col items-center justify-center min-h-[280px] border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                <Upload size={40} className="text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">{t("upload_leaf")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("file_format_hint")}</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            ) : (
              <div className="space-y-4">
                <img src={image} alt={t("uploaded_leaf")} className="w-full h-64 object-cover rounded-xl" />
                <div className="flex gap-3">
                  <Button className="flex-1 agri-btn-press" onClick={analyze} disabled={analyzing}>
                    {analyzing ? t("analyzing") : t("detect_disease")}
                  </Button>
                  <Button variant="outline" onClick={reset} className="agri-btn-press">{t("reset")}</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          {result ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="agri-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${result.severity === "high" ? "bg-destructive/10" : "bg-accent/20"}`}>
                    <AlertTriangle size={20} className={result.severity === "high" ? "text-destructive" : "text-accent-foreground"} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t(result.diseaseKey)}</h3>
                    <p className="text-xs text-muted-foreground">{t("confidence")}: {result.confidence}% · {t("severity")}: {t(result.severity)}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(result.descKey)}</p>
              </div>

              <div className="agri-card">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={18} className="text-primary" />
                  <h3 className="font-semibold text-foreground">{t("recommended_treatment")}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(result.treatmentKey)}</p>
              </div>
            </motion.div>
          ) : (
            <div className="agri-card flex flex-col items-center justify-center min-h-[300px] text-center">
              <div className="p-4 rounded-2xl bg-muted mb-4">
                <Leaf size={32} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">{t("upload_and_detect")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiseaseDetection;
