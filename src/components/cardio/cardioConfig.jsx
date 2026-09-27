import {
  Footprints,
  Bike,
  Activity,
  Mountain,
  TrendingUp,
  Waves,
  Dumbbell,
  MapPin,
} from "lucide-react";

// MET values for calorie estimation (calories = MET * kg * hours)
export const MET = {
  "Treadmill (Run)": 9.8,
  "Treadmill (Walk)": 3.5,
  "Stationary Bike": 6.8,
  Elliptical: 5.0,
  "Stair Climber": 8.8,
  "Rowing Machine": 7.0,
  "Arc Trainer": 5.5,
  SkiErg: 6.8,
  Running: 9.8,
  Cycling: 7.5,
  Walking: 4.3,
  Hiking: 6.0,
  "Trail Running": 9.0,
};

export const STATIONARY_ACTIVITIES = [
  { name: "Treadmill (Run)", icon: Footprints },
  { name: "Treadmill (Walk)", icon: Footprints },
  { name: "Stationary Bike", icon: Bike },
  { name: "Elliptical", icon: Activity },
  { name: "Stair Climber", icon: TrendingUp },
  { name: "Rowing Machine", icon: Waves },
  { name: "Arc Trainer", icon: Activity },
  { name: "SkiErg", icon: Activity },
];

export const MOBILE_ACTIVITIES = [
  { name: "Running", icon: Footprints },
  { name: "Cycling", icon: Bike },
  { name: "Walking", icon: Footprints },
  { name: "Hiking", icon: Mountain },
  { name: "Trail Running", icon: Mountain },
];

// Activities that support a manual distance entry (machine readout)
export const DISTANCE_CAPABLE = [
  "Treadmill (Run)",
  "Treadmill (Walk)",
  "Rowing Machine",
];

export function getActivityIcon(name) {
  const all = [...STATIONARY_ACTIVITIES, ...MOBILE_ACTIVITIES];
  const found = all.find((a) => a.name === name);
  return found ? found.icon : Activity;
}

export function getMet(name) {
  return MET[name] || 5.0;
}

export function getActivityMode(name) {
  return STATIONARY_ACTIVITIES.some((a) => a.name === name)
    ? "stationary"
    : "mobile";
}

// Icon for mode selection cards
export const MODE_ICONS = {
  stationary: Dumbbell,
  mobile: MapPin,
};