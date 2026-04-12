// Crop-specific daily task schedules
export interface DailyTask {
  dayStart: number;
  dayEnd: number;
  taskKey: string;
  stageKey: string;
}

export type CropSchedule = DailyTask[];

const wheatSchedule: CropSchedule = [
  { dayStart: -14, dayEnd: -10, taskKey: "task_plough_field", stageKey: "planner_stage_land_prep" },
  { dayStart: -9, dayEnd: -5, taskKey: "task_level_soil", stageKey: "planner_stage_land_prep" },
  { dayStart: -4, dayEnd: -1, taskKey: "task_add_organic_matter", stageKey: "planner_stage_land_prep" },
  { dayStart: 0, dayEnd: 2, taskKey: "task_sow_seeds", stageKey: "planner_stage_sowing" },
  { dayStart: 3, dayEnd: 5, taskKey: "task_apply_basal_fertilizer", stageKey: "planner_stage_fertilization" },
  { dayStart: 10, dayEnd: 10, taskKey: "task_first_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 15, dayEnd: 15, taskKey: "task_top_dressing_urea", stageKey: "planner_stage_fertilization" },
  { dayStart: 20, dayEnd: 20, taskKey: "task_weed_removal", stageKey: "planner_stage_pest_control" },
  { dayStart: 25, dayEnd: 25, taskKey: "task_pest_inspection", stageKey: "planner_stage_pest_control" },
  { dayStart: 30, dayEnd: 30, taskKey: "task_second_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 40, dayEnd: 40, taskKey: "task_spray_pesticide", stageKey: "planner_stage_pest_control" },
  { dayStart: 50, dayEnd: 50, taskKey: "task_third_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 60, dayEnd: 60, taskKey: "task_growth_check", stageKey: "planner_stage_growth" },
  { dayStart: 70, dayEnd: 70, taskKey: "task_flowering_monitor", stageKey: "planner_stage_growth" },
  { dayStart: 85, dayEnd: 85, taskKey: "task_grain_filling", stageKey: "planner_stage_growth" },
  { dayStart: 110, dayEnd: 120, taskKey: "task_harvest_crop", stageKey: "planner_stage_harvesting" },
  { dayStart: 121, dayEnd: 123, taskKey: "task_drying_threshing", stageKey: "planner_stage_harvesting" },
  { dayStart: 124, dayEnd: 126, taskKey: "task_storage_grading", stageKey: "planner_stage_selling" },
  { dayStart: 127, dayEnd: 130, taskKey: "task_sell_market", stageKey: "planner_stage_selling" },
];

const riceSchedule: CropSchedule = [
  { dayStart: -14, dayEnd: -10, taskKey: "task_plough_field", stageKey: "planner_stage_land_prep" },
  { dayStart: -9, dayEnd: -5, taskKey: "task_puddling", stageKey: "planner_stage_land_prep" },
  { dayStart: -4, dayEnd: -1, taskKey: "task_level_soil", stageKey: "planner_stage_land_prep" },
  { dayStart: 0, dayEnd: 3, taskKey: "task_transplanting", stageKey: "planner_stage_sowing" },
  { dayStart: 5, dayEnd: 5, taskKey: "task_apply_basal_fertilizer", stageKey: "planner_stage_fertilization" },
  { dayStart: 10, dayEnd: 10, taskKey: "task_first_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 20, dayEnd: 20, taskKey: "task_weed_removal", stageKey: "planner_stage_pest_control" },
  { dayStart: 25, dayEnd: 25, taskKey: "task_top_dressing_urea", stageKey: "planner_stage_fertilization" },
  { dayStart: 30, dayEnd: 30, taskKey: "task_pest_inspection", stageKey: "planner_stage_pest_control" },
  { dayStart: 40, dayEnd: 40, taskKey: "task_second_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 45, dayEnd: 45, taskKey: "task_spray_pesticide", stageKey: "planner_stage_pest_control" },
  { dayStart: 55, dayEnd: 55, taskKey: "task_top_dressing_urea", stageKey: "planner_stage_fertilization" },
  { dayStart: 60, dayEnd: 60, taskKey: "task_growth_check", stageKey: "planner_stage_growth" },
  { dayStart: 75, dayEnd: 75, taskKey: "task_flowering_monitor", stageKey: "planner_stage_growth" },
  { dayStart: 90, dayEnd: 90, taskKey: "task_grain_filling", stageKey: "planner_stage_growth" },
  { dayStart: 110, dayEnd: 120, taskKey: "task_harvest_crop", stageKey: "planner_stage_harvesting" },
  { dayStart: 121, dayEnd: 124, taskKey: "task_drying_threshing", stageKey: "planner_stage_harvesting" },
  { dayStart: 125, dayEnd: 127, taskKey: "task_storage_grading", stageKey: "planner_stage_selling" },
  { dayStart: 128, dayEnd: 132, taskKey: "task_sell_market", stageKey: "planner_stage_selling" },
];

const cottonSchedule: CropSchedule = [
  { dayStart: -14, dayEnd: -8, taskKey: "task_plough_field", stageKey: "planner_stage_land_prep" },
  { dayStart: -7, dayEnd: -1, taskKey: "task_level_soil", stageKey: "planner_stage_land_prep" },
  { dayStart: 0, dayEnd: 3, taskKey: "task_sow_seeds", stageKey: "planner_stage_sowing" },
  { dayStart: 7, dayEnd: 7, taskKey: "task_first_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 15, dayEnd: 15, taskKey: "task_apply_basal_fertilizer", stageKey: "planner_stage_fertilization" },
  { dayStart: 25, dayEnd: 25, taskKey: "task_weed_removal", stageKey: "planner_stage_pest_control" },
  { dayStart: 30, dayEnd: 30, taskKey: "task_pest_inspection", stageKey: "planner_stage_pest_control" },
  { dayStart: 40, dayEnd: 40, taskKey: "task_second_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 50, dayEnd: 50, taskKey: "task_top_dressing_urea", stageKey: "planner_stage_fertilization" },
  { dayStart: 60, dayEnd: 60, taskKey: "task_spray_pesticide", stageKey: "planner_stage_pest_control" },
  { dayStart: 75, dayEnd: 75, taskKey: "task_flowering_monitor", stageKey: "planner_stage_growth" },
  { dayStart: 90, dayEnd: 90, taskKey: "task_growth_check", stageKey: "planner_stage_growth" },
  { dayStart: 120, dayEnd: 140, taskKey: "task_picking_bolls", stageKey: "planner_stage_harvesting" },
  { dayStart: 141, dayEnd: 145, taskKey: "task_storage_grading", stageKey: "planner_stage_selling" },
  { dayStart: 146, dayEnd: 150, taskKey: "task_sell_market", stageKey: "planner_stage_selling" },
];

const sugarcaneSchedule: CropSchedule = [
  { dayStart: -14, dayEnd: -8, taskKey: "task_plough_field", stageKey: "planner_stage_land_prep" },
  { dayStart: -7, dayEnd: -1, taskKey: "task_add_organic_matter", stageKey: "planner_stage_land_prep" },
  { dayStart: 0, dayEnd: 5, taskKey: "task_sow_seeds", stageKey: "planner_stage_sowing" },
  { dayStart: 10, dayEnd: 10, taskKey: "task_first_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 20, dayEnd: 20, taskKey: "task_apply_basal_fertilizer", stageKey: "planner_stage_fertilization" },
  { dayStart: 30, dayEnd: 30, taskKey: "task_weed_removal", stageKey: "planner_stage_pest_control" },
  { dayStart: 40, dayEnd: 40, taskKey: "task_second_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 50, dayEnd: 50, taskKey: "task_earthing_up", stageKey: "planner_stage_growth" },
  { dayStart: 60, dayEnd: 60, taskKey: "task_top_dressing_urea", stageKey: "planner_stage_fertilization" },
  { dayStart: 75, dayEnd: 75, taskKey: "task_pest_inspection", stageKey: "planner_stage_pest_control" },
  { dayStart: 90, dayEnd: 90, taskKey: "task_third_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 100, dayEnd: 100, taskKey: "task_growth_check", stageKey: "planner_stage_growth" },
  { dayStart: 120, dayEnd: 120, taskKey: "task_earthing_up", stageKey: "planner_stage_growth" },
  { dayStart: 150, dayEnd: 150, taskKey: "task_spray_pesticide", stageKey: "planner_stage_pest_control" },
  { dayStart: 200, dayEnd: 200, taskKey: "task_ratoon_management", stageKey: "planner_stage_growth" },
  { dayStart: 300, dayEnd: 330, taskKey: "task_harvest_crop", stageKey: "planner_stage_harvesting" },
  { dayStart: 331, dayEnd: 340, taskKey: "task_sell_market", stageKey: "planner_stage_selling" },
];

const maizeSchedule: CropSchedule = [
  { dayStart: -10, dayEnd: -6, taskKey: "task_plough_field", stageKey: "planner_stage_land_prep" },
  { dayStart: -5, dayEnd: -1, taskKey: "task_level_soil", stageKey: "planner_stage_land_prep" },
  { dayStart: 0, dayEnd: 2, taskKey: "task_sow_seeds", stageKey: "planner_stage_sowing" },
  { dayStart: 5, dayEnd: 5, taskKey: "task_apply_basal_fertilizer", stageKey: "planner_stage_fertilization" },
  { dayStart: 10, dayEnd: 10, taskKey: "task_first_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 20, dayEnd: 20, taskKey: "task_weed_removal", stageKey: "planner_stage_pest_control" },
  { dayStart: 25, dayEnd: 25, taskKey: "task_top_dressing_urea", stageKey: "planner_stage_fertilization" },
  { dayStart: 30, dayEnd: 30, taskKey: "task_pest_inspection", stageKey: "planner_stage_pest_control" },
  { dayStart: 35, dayEnd: 35, taskKey: "task_second_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 50, dayEnd: 50, taskKey: "task_growth_check", stageKey: "planner_stage_growth" },
  { dayStart: 60, dayEnd: 60, taskKey: "task_flowering_monitor", stageKey: "planner_stage_growth" },
  { dayStart: 75, dayEnd: 75, taskKey: "task_grain_filling", stageKey: "planner_stage_growth" },
  { dayStart: 90, dayEnd: 100, taskKey: "task_harvest_crop", stageKey: "planner_stage_harvesting" },
  { dayStart: 101, dayEnd: 103, taskKey: "task_drying_threshing", stageKey: "planner_stage_harvesting" },
  { dayStart: 104, dayEnd: 107, taskKey: "task_sell_market", stageKey: "planner_stage_selling" },
];

const soybeanSchedule: CropSchedule = [
  { dayStart: -10, dayEnd: -6, taskKey: "task_plough_field", stageKey: "planner_stage_land_prep" },
  { dayStart: -5, dayEnd: -1, taskKey: "task_level_soil", stageKey: "planner_stage_land_prep" },
  { dayStart: 0, dayEnd: 2, taskKey: "task_sow_seeds", stageKey: "planner_stage_sowing" },
  { dayStart: 5, dayEnd: 5, taskKey: "task_apply_basal_fertilizer", stageKey: "planner_stage_fertilization" },
  { dayStart: 10, dayEnd: 10, taskKey: "task_first_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 20, dayEnd: 20, taskKey: "task_weed_removal", stageKey: "planner_stage_pest_control" },
  { dayStart: 30, dayEnd: 30, taskKey: "task_pest_inspection", stageKey: "planner_stage_pest_control" },
  { dayStart: 40, dayEnd: 40, taskKey: "task_second_irrigation", stageKey: "planner_stage_irrigation" },
  { dayStart: 50, dayEnd: 50, taskKey: "task_flowering_monitor", stageKey: "planner_stage_growth" },
  { dayStart: 60, dayEnd: 60, taskKey: "task_growth_check", stageKey: "planner_stage_growth" },
  { dayStart: 80, dayEnd: 90, taskKey: "task_harvest_crop", stageKey: "planner_stage_harvesting" },
  { dayStart: 91, dayEnd: 93, taskKey: "task_drying_threshing", stageKey: "planner_stage_harvesting" },
  { dayStart: 94, dayEnd: 97, taskKey: "task_sell_market", stageKey: "planner_stage_selling" },
];

export const CROP_DURATIONS: Record<string, number> = {
  Wheat: 120,
  Rice: 120,
  Cotton: 150,
  Maize: 100,
  Sugarcane: 330,
  Soybean: 90,
};

export const CROP_SCHEDULES: Record<string, CropSchedule> = {
  Wheat: wheatSchedule,
  Rice: riceSchedule,
  Cotton: cottonSchedule,
  Maize: maizeSchedule,
  Sugarcane: sugarcaneSchedule,
  Soybean: soybeanSchedule,
};
