import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Fetch the current user's Variation records (shared cache via React Query, so
// many ExerciseBlock instances reuse one fetch).
export function useVariations() {
  return useQuery({
    queryKey: ["variations"],
    queryFn: async () => {
      const list = await base44.entities.Variation.list(null, 500);
      return list || [];
    },
    staleTime: 60000,
  });
}

// Resolve the live movement_pattern + primary_muscle for a variation slot.
// Prefers the live Variation record (looked up by variation_id) so that edits
// to a Variation automatically propagate to every template using it — no stale
// snapshots to patch manually. Falls back to the slot's locally-snapshot values
// for legacy data, logging a warning so stale slots can be identified and fixed.
export function resolveVariationSlot(slot, variations = []) {
  const variationId = slot?.variation_id;
  if (variationId) {
    const live = variations.find((v) => v.id === variationId);
    if (live) {
      return {
        movementPattern: live.movement_pattern,
        primaryMuscle: live.primary_muscle,
        fromLive: true,
      };
    }
    console.warn(
      "[variation] variation_id set but Variation record not found — using snapshot:",
      {
        variation_id: variationId,
        movement_pattern: slot.movement_pattern,
        primary_muscle: slot.primary_muscle,
      }
    );
  } else if (slot?.type === "variation") {
    console.warn(
      "[variation] legacy variation slot without variation_id — using snapshot:",
      {
        movement_pattern: slot.movement_pattern,
        primary_muscle: slot.primary_muscle,
        name: slot.exercise_name,
      }
    );
  }
  return {
    movementPattern: slot?.movement_pattern,
    primaryMuscle: slot?.primary_muscle,
    fromLive: false,
  };
}