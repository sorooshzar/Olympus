import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// One-time migration: for every WorkoutTemplate, find exercise entries with a
// valid exercise_id but null primary_muscle, look up the Exercise entity, and
// set primary_muscle (and muscle_group) correctly. Variation-type slots are
// skipped — they already carry primary_muscle directly.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [templates, exercises] = await Promise.all([
      base44.asServiceRole.entities.WorkoutTemplate.list(null, 500),
      base44.asServiceRole.entities.Exercise.list(null, 500),
    ]);
    const exerciseMap = {};
    const exerciseByName = {};
    exercises.forEach(e => {
      exerciseMap[e.id] = e;
      if (e.name) exerciseByName[e.name] = e;
    });
    // Resolve by ID first, falling back to exact name match — older templates
    // reference exercise IDs that were recreated, so ID lookup alone misses them.
    const resolveMeta = (ex) => exerciseMap[ex.exercise_id] || exerciseByName[ex.exercise_name];

    let templatesPatched = 0;
    let entriesPatched = 0;
    const updates = [];

    templates.forEach(t => {
      let changed = false;
      const patchedExercises = (t.exercises || []).map(ex => {
        if (ex.type === "variation") return ex;
        if (!ex.exercise_id) return ex;
        const meta = resolveMeta(ex);
        if (!meta || !meta.primary_muscle) return ex;
        const needsPatch = !ex.primary_muscle || !ex.muscle_group;
        if (!needsPatch) return ex;
        changed = true;
        entriesPatched++;
        return {
          ...ex,
          primary_muscle: ex.primary_muscle || meta.primary_muscle,
          muscle_group: ex.muscle_group || meta.primary_muscle,
        };
      });
      if (changed) {
        templatesPatched++;
        updates.push(base44.asServiceRole.entities.WorkoutTemplate.update(t.id, { exercises: patchedExercises }));
      }
    });

    await Promise.all(updates);

    return Response.json({
      totalTemplates: templates.length,
      templatesPatched,
      entriesPatched,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}