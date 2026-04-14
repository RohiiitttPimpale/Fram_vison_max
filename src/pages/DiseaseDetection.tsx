import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Upload, AlertTriangle, CheckCircle, Leaf, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

interface ApiResponse {
  disease: string;
  confidence: number;
  severity: "low" | "medium" | "high";
}

interface ApiEnvelope {
  data?: ApiResponse;
  message?: string;
  error?: string;
}

interface DiagnosisResult {
  disease: string;
  confidence: number;
  severity: "low" | "medium" | "high";
  diseaseKey: string;
  descKey: string;
  treatmentKey: string;
}

// Map disease names to translation keys and provide fallback treatments
const DISEASE_MAP: Record<string, { descKey: string; treatmentKey: string }> = {
  "Tomato_Early_blight": { descKey: "disease_early_blight_desc", treatmentKey: "disease_early_blight_treatment" },
  "Tomato_Late_blight": { descKey: "disease_late_blight_desc", treatmentKey: "disease_late_blight_treatment" },
  "Tomato_Septoria_leaf_spot": { descKey: "disease_septoria_desc", treatmentKey: "disease_septoria_treatment" },
  "Tomato_Spider_mites": { descKey: "disease_spider_mites_desc", treatmentKey: "disease_spider_mites_treatment" },
  "Tomato_Target_Spot": { descKey: "disease_target_spot_desc", treatmentKey: "disease_target_spot_treatment" },
  "Tomato_Yellow_Leaf_Curl_Virus": { descKey: "disease_ylcv_desc", treatmentKey: "disease_ylcv_treatment" },
  "Tomato_Mosaic_Virus": { descKey: "disease_mosaic_virus_desc", treatmentKey: "disease_mosaic_virus_treatment" },
  "Tomato_healthy": { descKey: "disease_healthy_desc", treatmentKey: "disease_healthy_treatment" },
};

const DiseaseDetection = () => {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      setError(t("error_file_too_large") || "File is too large (max 10MB)");
      toast({
        title: "Error",
        description: t("error_file_too_large") || "File is too large",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imageFile) return;

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const token = apiClient.getToken();
      if (!token) {
        throw new Error("Please log in again and retry.");
      }

      const apiBase = import.meta.env.VITE_API_URL || "/api";
      const response = await fetch(`${apiBase}/disease-detection/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = (await response.json()) as ApiEnvelope;
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Keep generic HTTP error when backend body isn't JSON.
        }
        throw new Error(errorMessage);
      }

      const payload = (await response.json()) as ApiEnvelope;
      const data = payload.data;
      if (!data) {
        throw new Error("Invalid response from disease detection API");
      }

      // Map API response to component format
      const diseaseKey = `disease_${data.disease.toLowerCase().replace(/ /g, "_")}`;
      const diseaseInfo = DISEASE_MAP[data.disease] || {
        descKey: "disease_unknown_desc",
        treatmentKey: "disease_unknown_treatment",
      };

      const diagnosisResult: DiagnosisResult = {
        disease: data.disease,
        confidence: Math.round(data.confidence * 100),
        severity: data.severity,
        diseaseKey: diseaseKey,
        descKey: diseaseInfo.descKey,
        treatmentKey: diseaseInfo.treatmentKey,
      };

      setResult(diagnosisResult);
      toast({
        title: "Analysis Complete",
        description: `Detected: ${data.disease} (${diagnosisResult.confidence}% confidence)`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze image";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">{t("disease_detection")}</h1>
      <p className="text-muted-foreground mb-8">{t("disease_detection_desc")}</p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3"
        >
          <AlertCircle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">{t("error")}</h3>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="agri-card">
            {!image ? (
              <label className="flex flex-col items-center justify-center min-h-[280px] border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                <Upload size={40} className="text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">{t("upload_leaf")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("file_format_hint")}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <img src={image} alt={t("uploaded_leaf")} className="w-full h-64 object-cover rounded-xl" />
                <div className="flex gap-3">
                  <Button
                    className="flex-1 agri-btn-press"
                    onClick={analyze}
                    disabled={analyzing}
                  >
                    {analyzing ? t("analyzing") : t("detect_disease")}
                  </Button>
                  <Button variant="outline" onClick={reset} className="agri-btn-press">
                    {t("reset")}
                  </Button>
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
                  <div
                    className={`p-2 rounded-lg ${
                      result.severity === "high" ? "bg-destructive/10" : "bg-accent/20"
                    }`}
                  >
                    <AlertTriangle
                      size={20}
                      className={
                        result.severity === "high"
                          ? "text-destructive"
                          : "text-accent-foreground"
                      }
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{result.disease}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t("confidence")}: {result.confidence}% · {t("severity")}: {t(result.severity)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(result.descKey)}
                </p>
              </div>

              <div className="agri-card">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={18} className="text-primary" />
                  <h3 className="font-semibold text-foreground">{t("recommended_treatment")}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(result.treatmentKey)}
                </p>
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
