import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { CROPS, simulateWeather, predictYield, type WeatherData } from "@/lib/agri-data";
import { DailyTask } from "@/lib/crop-schedules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, IndianRupee, Store, ShieldCheck, BarChart3, Package, Warehouse, CheckCircle2 } from "lucide-react";

interface SellingStageProps {
  selectedCrop: string;
  startDate: string;
  schedule: DailyTask[];
  completedTasks: Set<string>;
  getTaskId: (task: DailyTask) => string;
  isHarvestCompleted: boolean;
  weatherData?: WeatherData | null;
}

const MOCK_MSP: Record<string, number> = {
  Wheat: 2275,
  Rice: 2203,
  Cotton: 6620,
  Maize: 2090,
  Sugarcane: 315,
  Soybean: 4600,
};

const MOCK_MARKET_PRICE: Record<string, number> = {
  Wheat: 2450,
  Rice: 2500,
  Cotton: 7100,
  Maize: 2200,
  Sugarcane: 350,
  Soybean: 5000,
};

const SellingStage = ({ selectedCrop, startDate, schedule, completedTasks, getTaskId, isHarvestCompleted, weatherData }: SellingStageProps) => {
  const { t } = useLanguage();
  const [decision, setDecision] = useState<"sell" | "store" | null>(null);

  const crop = CROPS.find(c => c.name === selectedCrop);

  const yieldResult = useMemo(() => {
    if (!crop) return null;
    const weather = weatherData || simulateWeather();
    return predictYield(crop, weather, crop.optimalN, crop.optimalP, crop.optimalK, 6.5);
  }, [crop, weatherData]);

  const sellingWindow = useMemo(() => {
    const sellingTasks = schedule.filter(t => t.stageKey === "planner_stage_selling");
    if (sellingTasks.length === 0) return null;
    const first = sellingTasks[0].dayStart;
    const last = sellingTasks[sellingTasks.length - 1].dayEnd;
    const base = new Date(startDate);
    const from = new Date(base);
    from.setDate(from.getDate() + first);
    const to = new Date(base);
    to.setDate(to.getDate() + last);
    return { from: from.toLocaleDateString(), to: to.toLocaleDateString() };
  }, [schedule, startDate]);

  // Only show after harvest is completed
  if (!isHarvestCompleted) return null;

  const msp = MOCK_MSP[selectedCrop] || 0;
  const marketPrice = MOCK_MARKET_PRICE[selectedCrop] || msp;
  const yieldTons = yieldResult?.predictedYield || 0;
  const yieldQuintals = yieldTons * 10; // 1 ton = 10 quintals
  const estimatedRevenue = Math.round(yieldQuintals * marketPrice);
  const estimatedCost = Math.round(estimatedRevenue * 0.45); // rough 45% cost ratio
  const estimatedProfit = estimatedRevenue - estimatedCost;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mb-8 space-y-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Store size={22} className="text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{t("planner_selling_title")}</h2>
        <Badge variant="default" className="ml-2">{t("planner_ready_to_sell")}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Expected Yield */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              {t("planner_expected_yield")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {yieldResult ? (
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {yieldResult.predictedYield} <span className="text-sm font-normal text-muted-foreground">{yieldResult.unit}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("planner_confidence")}: {yieldResult.confidence}%
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        {/* Profit Estimation */}
        <Card className="border-2 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IndianRupee size={16} className="text-green-600" />
              {t("selling_profit_estimate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("selling_revenue")}</span>
                <span className="font-medium text-foreground">₹{estimatedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("selling_est_cost")}</span>
                <span className="font-medium text-foreground">₹{estimatedCost.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between text-sm">
                <span className="font-semibold text-foreground">{t("selling_est_profit")}</span>
                <span className="font-bold text-green-600">₹{estimatedProfit.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Time to Sell */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              {t("planner_best_time_sell")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sellingWindow ? (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{sellingWindow.from} — {sellingWindow.to}</p>
                <p className="mt-1 text-xs">{t("planner_sell_window_tip")}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("planner_sell_window_pending")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Market Tips */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            {t("planner_market_tips")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <ShieldCheck size={14} className="text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{t("planner_tip_check_msp", { price: String(msp) })}</span>
            </li>
            <li className="flex items-start gap-2">
              <Store size={14} className="text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{t("planner_tip_sell_mandi")}</span>
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp size={14} className="text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{t("planner_tip_compare_prices")}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Decision: Sell Now or Store */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className={`border-2 cursor-pointer transition-all ${
            decision === "sell" ? "border-green-500 bg-green-50/30 dark:bg-green-900/10" : "border-primary/20 hover:border-primary/40"
          }`}
          onClick={() => setDecision("sell")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Package size={24} className="text-green-600" />
              <h3 className="font-semibold text-foreground">{t("selling_sell_now")}</h3>
              {decision === "sell" && <CheckCircle2 size={18} className="text-green-600 ml-auto" />}
            </div>
            <p className="text-sm text-muted-foreground">{t("selling_sell_now_desc")}</p>
          </CardContent>
        </Card>

        <Card
          className={`border-2 cursor-pointer transition-all ${
            decision === "store" ? "border-amber-500 bg-amber-50/30 dark:bg-amber-900/10" : "border-primary/20 hover:border-primary/40"
          }`}
          onClick={() => setDecision("store")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Warehouse size={24} className="text-amber-600" />
              <h3 className="font-semibold text-foreground">{t("selling_store_later")}</h3>
              {decision === "store" && <CheckCircle2 size={18} className="text-amber-600 ml-auto" />}
            </div>
            <p className="text-sm text-muted-foreground">{t("selling_store_later_desc")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Post-Harvest Tips */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("selling_post_harvest_tips")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t("post_harvest_tip_1")}</li>
            <li>• {t("post_harvest_tip_2")}</li>
            <li>• {t("post_harvest_tip_3")}</li>
            <li>• {t("post_harvest_tip_4")}</li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SellingStage;
