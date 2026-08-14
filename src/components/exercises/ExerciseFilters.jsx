import React from "react";
import { ArrowUpDown, Check, ChevronDown, Crown, Star, Archive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MUSCLE_HIERARCHY } from "@/components/utils/muscleHierarchy";

const EQUIPMENT = ["Barbell", "Dumbbell", "Machine", "Smith Machine", "Bodyweight", "Cable", "Band", "Other"];
const SORT_OPTIONS = [
  { id: "name", label: "Name (A–Z)" },
  { id: "frequency", label: "Most Performed" },
  { id: "recency", label: "Most Recent" },
];

export default function ExerciseFilters({ filters, onFiltersChange }) {
  const toggleMuscleGroup = (muscleGroup) => {
    const current = filters.muscleGroups || [];
    const next = current.includes(muscleGroup) ? current.filter((x) => x !== muscleGroup) : [...current, muscleGroup];
    onFiltersChange({ ...filters, muscleGroups: next });
  };

  const toggleEquipment = (eq) => {
    const key = eq.toLowerCase().replace(" ", "_");
    const current = filters.equipment || [];
    const next = current.includes(key) ? current.filter((x) => x !== key) : [...current, key];
    onFiltersChange({ ...filters, equipment: next });
  };

  const setSort = (id) => onFiltersChange({ ...filters, sort: id });

  const muscleCount = (filters.muscleGroups || []).length;
  const eqCount = (filters.equipment || []).length;
  const rankedActive = !!filters.ranked;
  const favActive = !!filters.favouritesOnly;
  const archivedActive = !!filters.archived;

  return (
    <div className="flex gap-2 items-center">
      {/* Ranked toggle — crown only */}
      <button
        onClick={() => onFiltersChange({ ...filters, ranked: !rankedActive })}
        className={`flex items-center justify-center px-2.5 py-2 rounded-xl text-xs font-medium border transition-all flex-shrink-0 ${
          rankedActive ? "border-amber-400/50 bg-amber-400/15 text-amber-400" : "border-border bg-secondary text-muted-foreground"
        }`}
      >
        <Crown className="w-3.5 h-3.5" fill={rankedActive ? "#FFD700" : "none"} strokeWidth={1.5} />
      </button>

      {/* Muscle Group Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all flex-shrink-0 w-[92px] ${
              muscleCount > 0 ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            <span className="text-left truncate">
              {muscleCount > 0 ? `Muscle (${muscleCount})` : "Muscle"}
            </span>
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {Object.keys(MUSCLE_HIERARCHY).map((muscleGroup) => {
            const active = (filters.muscleGroups || []).includes(muscleGroup);
            return (
              <DropdownMenuItem
                key={muscleGroup}
                onClick={() => toggleMuscleGroup(muscleGroup)}
                className="text-xs"
              >
                <span className={active ? "text-primary font-semibold" : "text-foreground"}>{muscleGroup}</span>
                {active && <Check className="w-3 h-3 ml-auto text-primary" />}
              </DropdownMenuItem>
            );
          })}
          {muscleCount > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              <DropdownMenuItem
                onClick={() => onFiltersChange({ ...filters, muscleGroups: [] })}
                className="text-xs text-destructive"
              >
                Clear Filter
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Equipment Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all flex-shrink-0 w-[108px] ${
              eqCount > 0 ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            <span className="text-left whitespace-nowrap">
              {eqCount > 0 ? `Equip (${eqCount})` : "Equipment"}
            </span>
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {EQUIPMENT.map((eq) => {
            const key = eq.toLowerCase().replace(" ", "_");
            const active = (filters.equipment || []).includes(key);
            return (
              <DropdownMenuItem
                key={eq}
                onClick={() => toggleEquipment(eq)}
                className="text-xs"
              >
                <span className={active ? "text-primary font-semibold" : "text-foreground"}>{eq}</span>
                {active && <Check className="w-3 h-3 ml-auto text-primary" />}
              </DropdownMenuItem>
            );
          })}
          {eqCount > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              <DropdownMenuItem
                onClick={() => onFiltersChange({ ...filters, equipment: [] })}
                className="text-xs text-destructive"
              >
                Clear Filter
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all flex-shrink-0 ${
            filters.sort && filters.sort !== "name" ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"
          }`}>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {SORT_OPTIONS.map((o) => (
            <DropdownMenuItem key={o.id} onClick={() => setSort(o.id)}
              className={`text-xs ${filters.sort === o.id ? "text-primary font-semibold" : ""}`}>
              {o.label}
              {filters.sort === o.id && <Check className="w-3 h-3 ml-auto text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Favourites toggle — star only */}
      <button
        onClick={() => onFiltersChange({ ...filters, favouritesOnly: !favActive })}
        className={`flex items-center justify-center px-2.5 py-2 rounded-xl text-xs font-medium border transition-all flex-shrink-0 ${
          favActive ? "border-amber-400/50 bg-amber-400/15 text-amber-400" : "border-border bg-secondary text-muted-foreground"
        }`}
      >
        <Star className="w-3.5 h-3.5" fill={favActive ? "#FFD700" : "none"} strokeWidth={1.5} />
      </button>

      {/* Archived toggle */}
      <button
        onClick={() => onFiltersChange({ ...filters, archived: !archivedActive })}
        className={`flex items-center justify-center px-2.5 py-2 rounded-xl text-xs font-medium border transition-all flex-shrink-0 ${
          archivedActive ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"
        }`}
      >
        <Archive className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}