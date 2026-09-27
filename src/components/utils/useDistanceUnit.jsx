import { useState, useEffect } from "react";
import { userStorage } from "@/components/utils/userStorage";

// Distance is stored in KM (base unit) in CardioLog.distance.
// This hook returns the user's display preference (metric=km / imperial=mi).
export function useDistanceUnit() {
  const [unit, setUnit] = useState(() => userStorage.getItem("gym-distance-unit") || "metric");

  useEffect(() => {
    const handler = () => setUnit(userStorage.getItem("gym-distance-unit") || "metric");
    window.addEventListener("distanceUnitChanged", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("distanceUnitChanged", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isMetric = unit !== "imperial";
  const label = isMetric ? "km" : "mi";

  // km (stored) → display value
  const toDisplay = (km) => {
    if (km == null || Number.isNaN(km)) return km;
    return isMetric ? km : km * 0.621371;
  };

  // display value → km (for storage)
  const toKm = (val) => {
    if (val == null || Number.isNaN(val)) return val;
    return isMetric ? val : val / 0.621371;
  };

  return { unit, isMetric, label, toDisplay, toKm };
}