export enum ServiceType {
  HaircutforElder = "Soch olish kattalar uchun",
  HaircutforChildren = "Soch olish bolalar uchun",
  HairStraightening = "Kantovka to'g'rilash",
  BeardTrim = "Soqol olish",
  HairWash = "Bosh yuvish",
  Combo = "Combo (soch olish + soqol olish + yuz chistkasi)",
  HairColoring = "Soch bo'yash",
  BeardColoring = "Soqol bo'yash",
  FaceMask = "Yuz niqobi",
  HairCurling = "Soch jingalak qilish",
  HairBalding = "Sochni kalga oldirish",
  HairStylingforBridgeGroom = "Soch olish (to'y uchun)",
}

export const ServicePrices: Record<ServiceType, number> = {
  [ServiceType.HaircutforElder]: 40000,
  [ServiceType.HaircutforChildren]: 30000,
  [ServiceType.HairStraightening]: 25000,
  [ServiceType.BeardTrim]: 25000,
  [ServiceType.HairWash]: 25000,
  [ServiceType.Combo]: 80000,
  [ServiceType.HairColoring]: 35000,
  [ServiceType.BeardColoring]: 35000,
  [ServiceType.FaceMask]: 25000,
  [ServiceType.HairCurling]: 30000,
  [ServiceType.HairBalding]: 20000,
  [ServiceType.HairStylingforBridgeGroom]: 300000,
};
