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

// Per-activity-type color palette (Strava-inspired)
export const ACTIVITY_COLORS = {
  Running: "#FF5722",
  "Trail Running": "#FF7043",
  Jogging: "#FF5722",
  "Treadmill (Run)": "#FF7043",
  "Treadmill (Walk)": "#FF8A65",
  Cycling: "#2196F3",
  "Stationary Bike": "#42A5F5",
  Swimming: "#00BCD4",
  Walking: "#4CAF50",
  Hiking: "#4CAF50",
  "Stair Climber": "#FFC107",
  Elliptical: "#AB47BC",
  "Rowing Machine": "#5C6BC0",
  "Arc Trainer": "#26A69A",
  SkiErg: "#7E57C2",
};

const DEFAULT_ACTIVITY_COLOR = "#2196F3";

export function getActivityColor(name) {
  return ACTIVITY_COLORS[name] || DEFAULT_ACTIVITY_COLOR;
}

export const MODE_COLORS = {
  mobile: "#FF5722",
  stationary: "#2196F3",
};

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