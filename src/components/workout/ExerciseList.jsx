import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ExerciseBlock from "./ExerciseBlock";
import SupersetBlock from "./SupersetBlock";
import SupersetPickerModal from "./SupersetPickerModal";
import {
  buildSupersetLabelMap,
  groupExercisesForRender,
  createSuperset,
  removeFromSuperset,
  dissolveSuperset,
} from "./supersetUtils";

/**
 * Shared exercise list with drag-and-drop and superset grouping.
 * Props:
 *  - exercises: array
 *  - onChange(newExercises): called on any mutation
 *  - isActive: bool (active workout mode)
 *  - prevSetsMap: { exercise_id -> sets[] }
 *  - droppableId: string
 */
export default function ExerciseList({ exercises, onChange, isActive = false, prevSetsMap = {}, droppableId = "exercises", onSetCompleted, onReplaceExercise }) {
  const [supersetPickerFor, setSupersetPickerFor] = useState(null); // index of exercise opening the picker

  const labelMap = buildSupersetLabelMap(exercises);
  const groups = groupExercisesForRender(exercises, labelMap);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;
    const reordered = Array.from(exercises);
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onChange(reordered);
  };

  const handleExerciseChange = (index, updated) => {
    const next = [...exercises];
    next[index] = updated;
    onChange(next);
  };

  const handleRemoveExercise = (index) => {
    // Also clean up superset if needed
    const withRemoved = exercises.filter((_, i) => i !== index);
    // Re-check superset dissolve for the group the removed exercise belonged to
    const removedGroup = exercises[index]?.superset_group;
    if (removedGroup) {
      const remaining = withRemoved.filter(ex => ex.superset_group === removedGroup);
      if (remaining.length < 2) {
        onChange(withRemoved.map(ex => ex.superset_group === removedGroup ? { ...ex, superset_group: null } : ex));
        return;
      }
    }
    onChange(withRemoved);
  };

  const handleMakeSuperset = (index) => {
    setSupersetPickerFor(index);
  };

  const handleSupersetConfirm = (indices) => {
    setSupersetPickerFor(null);
    onChange(createSuperset(exercises, indices));
  };

  const handleLeaveSuperset = (index) => {
    onChange(removeFromSuperset(exercises, index));
  };

  const handleDissolve = (supersetId) => {
    onChange(dissolveSuperset(exercises, supersetId));
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {groups.map((group, groupIdx) => {
                if (group.type === "single") {
                  const { exercise, index } = group;
                  return (
                    <Draggable
                      key={`ex-${exercise.exercise_id || index}-${index}`}
                      draggableId={`ex-${exercise.exercise_id || index}-${index}`}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`transition-shadow ${dragSnapshot.isDragging ? "shadow-2xl rounded-xl" : ""}`}
                        >
                          <ExerciseBlock
                            exercise={exercise}
                            index={index}
                            onChange={(updated) => handleExerciseChange(index, updated)}
                            onRemove={() => handleRemoveExercise(index)}
                            onReplace={onReplaceExercise ? () => onReplaceExercise(index) : undefined}
                            isActive={isActive}
                            previousSets={prevSetsMap[exercise.exercise_id] || []}
                            dragHandleProps={dragProvided.dragHandleProps}
                            onMakeSuperset={() => handleMakeSuperset(index)}
                            onLeaveSuperset={null}
                            onSetCompleted={onSetCompleted ? (set) => onSetCompleted(set, exercise) : undefined}
                          />
                        </div>
                      )}
                    </Draggable>
                  );
                }

                // Superset group — render as a single draggable block
                const { supersetId, label, members } = group;
                // Use the index of the FIRST member for the draggable position
                const firstIndex = members[0].index;

                return (
                  <Draggable
                    key={`ss-${supersetId}`}
                    draggableId={`ss-${supersetId}`}
                    index={firstIndex}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`transition-shadow ${dragSnapshot.isDragging ? "shadow-2xl rounded-xl" : ""}`}
                      >
                        <SupersetBlock
                         label={label}
                         members={members}
                         isActive={isActive}
                         prevSetsMap={prevSetsMap}
                         onDissolve={() => handleDissolve(supersetId)}
                         onExerciseChange={handleExerciseChange}
                         onExerciseRemove={handleRemoveExercise}
                         onExerciseReplace={onReplaceExercise}
                         onLeaveSuperset={handleLeaveSuperset}
                         dragHandlePropsMap={{ [firstIndex]: dragProvided.dragHandleProps }}
                         onSetCompleted={onSetCompleted}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {supersetPickerFor !== null && (
        <SupersetPickerModal
          exercises={exercises}
          currentIndex={supersetPickerFor}
          onConfirm={handleSupersetConfirm}
          onClose={() => setSupersetPickerFor(null)}
        />
      )}
    </>
  );
}