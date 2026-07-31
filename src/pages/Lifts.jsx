import React, { useState, useRef, useEffect } from "react";

import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Plus, FolderPlus, Dumbbell, History, Search, Library, ChevronRight, Archive, Calculator, Star, Bot } from "lucide-react";
import MuscleGroupIcon from "../components/utils/MuscleGroupIcon";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useActiveWorkout } from "../components/workout/ActiveWorkoutContext";
import PullToRefresh from "../components/mobile/PullToRefresh";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import FolderCard from "../components/workouts/FolderCard";
import WorkoutCard from "../components/workouts/WorkoutCard";
import CreateDialog from "../components/workouts/CreateDialog";
import ExerciseFilters from "../components/exercises/ExerciseFilters";
import CreateExerciseModal from "../components/exercises/CreateExerciseModal";
import ExerciseDetailModal from "../components/exercises/ExerciseDetailModal";
import { useWorkoutFolders, useWorkoutTemplates, useExercises, useWorkoutLogs } from "../components/hooks/useWorkoutData";
import { TABS, SPECIAL_FOLDERS } from "../components/utils/constants";
import { MUSCLE_HIERARCHY } from "../components/utils/muscleHierarchy";

function WorkoutsTab({ folders, templates, queryClient, navigate, startWorkout, setShowAiCoach }) {
  const [createType, setCreateType] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [folderToWipe, setFolderToWipe] = useState(null);
  const [renamingFolder, setRenamingFolder] = useState(null); // folder object
  const [renameValue, setRenameValue] = useState("");
  const [addingWorkoutToFolder, setAddingWorkoutToFolder] = useState(null); // folder object
  const [addWorkoutValue, setAddWorkoutValue] = useState("");
  const [isDraggingOuter, setIsDraggingOuter] = useState(false);

  const archivedFolder = folders.find(f => f.name === SPECIAL_FOLDERS.ARCHIVED);
  const regularFolders = folders.filter(f => f.name !== "Archived");
  const unfolderedTemplates = templates.filter((t) => !t.folder_id || t.folder_id === "none");

  // LOCAL state for outer list — prevents snap-back on drop
  const [outerItems, setOuterItems] = useState([]);

  // Sync outerItems from props only when not dragging (to avoid overwriting mid-drag)
  useEffect(() => {
    if (isDraggingOuter) return;
    const sortedFolders = [...regularFolders].sort((a, b) => (a.order || 0) - (b.order || 0));
    const sortedUnfoldered = [...unfolderedTemplates].sort((a, b) => (a.order || 0) - (b.order || 0));
    const items = [
      ...sortedFolders.map(f => ({ type: "folder", id: `folder-${f.id}`, data: f })),
      ...sortedUnfoldered.map(t => ({ type: "workout", id: `workout-${t.id}`, data: t })),
    ].sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
    setOuterItems(items);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, templates, isDraggingOuter]);

  const handleCreateFolder = async ({ name }) => {
    await base44.entities.WorkoutFolder.create({ name, order: folders.length });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
  };

  const handleCreateWorkout = async ({ name, folder_id }) => {
    await base44.entities.WorkoutTemplate.create({
      name, folder_id: folder_id === "none" ? null : folder_id,
      order: templates.length, exercises: [],
    });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  const handleDeleteFolder = (folder) => setFolderToDelete(folder);
  const handleWipeFolder = (folder) => setFolderToWipe(folder);

  const confirmDeleteFolder = async () => {
    const folder = folderToDelete;
    setFolderToDelete(null);
    const ft = templates.filter((t) => t.folder_id === folder.id);
    await Promise.all(ft.map(t => base44.entities.WorkoutTemplate.delete(t.id)));
    await base44.entities.WorkoutFolder.delete(folder.id);
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  const confirmWipeFolder = async () => {
    const folder = folderToWipe;
    setFolderToWipe(null);
    const ft = templates.filter((t) => t.folder_id === folder.id);
    await Promise.all(ft.map(t => base44.entities.WorkoutTemplate.delete(t.id)));
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };

  const handleRenameFolder = (folder) => {
    setRenameValue(folder.name);
    setRenamingFolder(folder);
  };

  const confirmRenameFolder = async () => {
    if (!renameValue.trim()) return;
    await base44.entities.WorkoutFolder.update(renamingFolder.id, { name: renameValue.trim() });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    setRenamingFolder(null);
  };

  const handleEditWorkout = (t) => navigate(createPageUrl(`EditWorkout?id=${t.id}`));
  const handleDeleteWorkout = async (t) => {
    await base44.entities.WorkoutTemplate.delete(t.id);
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };
  const handleDuplicateWorkout = async (t) => {
    await base44.entities.WorkoutTemplate.create({ name: `Duplicate (${t.name})`, folder_id: t.folder_id, order: templates.length, exercises: t.exercises });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };
  const handleArchiveWorkout = async (t) => {
    let archiveFolder = folders.find((f) => f.name === SPECIAL_FOLDERS.ARCHIVED);
    if (!archiveFolder) {
      archiveFolder = await base44.entities.WorkoutFolder.create({ name: SPECIAL_FOLDERS.ARCHIVED, order: 999 });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    }
    await base44.entities.WorkoutTemplate.update(t.id, { folder_id: archiveFolder.id });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };
  const handleUnarchiveWorkout = async (t) => {
    await base44.entities.WorkoutTemplate.update(t.id, { folder_id: null });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };
  const handleMoveToFolder = async (t, targetFolderId) => {
    await base44.entities.WorkoutTemplate.update(t.id, { folder_id: targetFolderId || null });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };
  const handleUpdateNotes = async (t, notes) => {
    await base44.entities.WorkoutTemplate.update(t.id, { notes });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
  };
  const handleStartWorkout = (t) => { startWorkout(t); navigate(createPageUrl("ActiveWorkout")); };
  const handleAddWorkoutToFolder = (folder) => {
    setAddWorkoutValue("");
    setAddingWorkoutToFolder(folder);
  };

  const confirmAddWorkoutToFolder = async () => {
    if (!addWorkoutValue.trim()) return;
    await base44.entities.WorkoutTemplate.create({ name: addWorkoutValue.trim(), folder_id: addingWorkoutToFolder.id, order: templates.length, exercises: [] });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
    setAddingWorkoutToFolder(null);
  };

  const handleOuterDragStart = () => setIsDraggingOuter(true);

  const handleOuterDragEnd = async (result) => {
    setIsDraggingOuter(false);
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    // Update local state immediately — no snap-back
    const reordered = Array.from(outerItems);
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const withOrder = reordered.map((item, i) => ({ ...item, data: { ...item.data, order: i } }));
    setOuterItems(withOrder);

    // Also sync React Query cache
    const folderMap = {}, templateMap = {};
    withOrder.forEach((item, i) => {
      if (item.type === "folder") folderMap[item.data.id] = i;
      else templateMap[item.data.id] = i;
    });
    queryClient.setQueryData(["folders"], (old = []) =>
      old.map(f => folderMap[f.id] !== undefined ? { ...f, order: folderMap[f.id] } : f)
    );
    queryClient.setQueryData(["templates"], (old = []) =>
      old.map(t => templateMap[t.id] !== undefined ? { ...t, order: templateMap[t.id] } : t)
    );

    // Persist
    await Promise.all([
      ...Object.entries(folderMap).map(([id, order]) => base44.entities.WorkoutFolder.update(id, { order })),
      ...Object.entries(templateMap).map(([id, order]) => base44.entities.WorkoutTemplate.update(id, { order })),
    ]);
  };

  const folderProps = {
    templates, folders,
    onRenameFolder: handleRenameFolder, onDeleteFolder: handleDeleteFolder,
    onWipeFolder: handleWipeFolder,
    onEditWorkout: handleEditWorkout, onDeleteWorkout: handleDeleteWorkout,
    onDuplicateWorkout: handleDuplicateWorkout, onArchiveWorkout: handleArchiveWorkout,
    onMoveToFolder: handleMoveToFolder, onUpdateNotes: handleUpdateNotes,
    onStartWorkout: handleStartWorkout, onAddWorkout: handleAddWorkoutToFolder,
  };

  return (
    <div className="space-y-3">
      <Button onClick={() => { startWorkout(null); navigate(createPageUrl("ActiveWorkout")); }} className="w-full h-14 rounded-xl text-base font-semibold gap-2 shadow-lg shadow-primary/20">
        <Zap className="w-5 h-5" /> Quick Start
      </Button>

      {/* My Routines header */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Routines</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2.5 gap-1.5 text-xs font-semibold text-primary" onClick={() => setShowAiCoach(true)}>
            <Bot className="w-4 h-4" /> AI Coach
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Plus className="w-5 h-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateType("folder")}><FolderPlus className="w-4 h-4 mr-2" /> Create Folder</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateType("workout")}><Dumbbell className="w-4 h-4 mr-2" /> Create Workout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Outer DnD: folders + standalone workouts (whole card is drag handle) */}
      <DragDropContext onDragStart={handleOuterDragStart} onDragEnd={handleOuterDragEnd}>
        <Droppable droppableId="outer-list">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {outerItems.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    item.type === "folder" ? (
                      <FolderCard
                        {...folderProps}
                        folder={item.data}
                        innerRef={dragProvided.innerRef}
                        draggableProps={dragProvided.draggableProps}
                        dragHandleProps={dragProvided.dragHandleProps}
                        isDragging={dragSnapshot.isDragging}
                        forceCollapsed={isDraggingOuter && !dragSnapshot.isDragging}
                        entranceIndex={index}
                      />
                    ) : (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        style={{
                          ...dragProvided.draggableProps.style,
                          touchAction: "none",
                        }}
                        className={`rounded-lg transition-all ${dragSnapshot.isDragging ? "shadow-xl opacity-95 scale-[1.01]" : ""}`}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                          style={{ willChange: "transform" }}
                        >
                        <WorkoutCard
                          template={item.data}
                          folders={folders}
                          onEdit={handleEditWorkout}
                          onDelete={handleDeleteWorkout}
                          onDuplicate={handleDuplicateWorkout}
                          onArchive={handleArchiveWorkout}
                          onMoveToFolder={handleMoveToFolder}
                          onUpdateNotes={handleUpdateNotes}
                          onStart={handleStartWorkout}
                        />
                        </motion.div>
                      </div>
                    )
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Archived folder (dimmed, collapsed by default, not draggable) */}
      {archivedFolder && (
        <div className="opacity-50">
          <FolderCard folder={archivedFolder} {...folderProps} isArchiveFolder
            onUnarchiveWorkout={handleUnarchiveWorkout}
            defaultOpen={false} />
        </div>
      )}

      {folders.length === 0 && unfolderedTemplates.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No workouts yet</p>
          <p className="text-xs text-muted-foreground mt-1">Tap + to create your first routine</p>
        </div>
      )}

      <CreateDialog open={!!createType} onClose={() => setCreateType(null)} type={createType}
        folders={folders} onSubmit={createType === "folder" ? handleCreateFolder : handleCreateWorkout} />

      {/* Rename Folder Modal */}
      {renamingFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center"
          onClick={() => setRenamingFolder(null)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base">Rename Folder</h3>
            <Input
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && confirmRenameFolder()}
              className="bg-secondary border-0"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setRenamingFolder(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
              <button onClick={confirmRenameFolder} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Workout to Folder Modal */}
      {addingWorkoutToFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center"
          onClick={() => setAddingWorkoutToFolder(null)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base">New Workout in "{addingWorkoutToFolder.name}"</h3>
            <Input
              placeholder="Workout name"
              value={addWorkoutValue}
              onChange={e => setAddWorkoutValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && confirmAddWorkoutToFolder()}
              className="bg-secondary border-0"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setAddingWorkoutToFolder(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
              <button onClick={confirmAddWorkoutToFolder} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      {folderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center"
          onClick={() => setFolderToDelete(null)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-base">Delete "{folderToDelete.name}"?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This will permanently delete the folder and all {templates.filter(t => t.folder_id === folderToDelete.id).length} workout(s) inside it. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFolderToDelete(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
              <button onClick={confirmDeleteFolder} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">Delete All</button>
            </div>
          </div>
        </div>
      )}

      {folderToWipe && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center"
          onClick={() => setFolderToWipe(null)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-base">Wipe Archived Workouts?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This will permanently delete all {templates.filter(t => t.folder_id === folderToWipe.id).length} archived workout(s). The folder itself will remain. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFolderToWipe(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
              <button onClick={confirmWipeFolder} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">Wipe All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExercisesTab() {
  const [search, setSearch] = useState("");
  const location = useLocation();
  const [exerciseToDelete, setExerciseToDelete] = useState(null);

  // Read ?submuscle= param set by MuscleModel — pre-filters to exact sub-muscle
  const urlParams = new URLSearchParams(location.search);
  const submuscleParam = urlParams.get("submuscle") ? decodeURIComponent(urlParams.get("submuscle")) : null;

  const [filters, setFilters] = useState({
    muscleGroups: [],
    equipment: [],
    sort: "name",
    subMuscle: submuscleParam || null,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const queryClient = useQueryClient();
  const { data: exercises = [], isLoading } = useExercises();
  const { data: workoutLogs = [] } = useWorkoutLogs();

  const freqMap = {};
  workoutLogs.forEach(log => {
    log.exercises?.forEach(ex => {
      if (ex.exercise_id) freqMap[ex.exercise_id] = (freqMap[ex.exercise_id] || 0) + 1;
    });
  });

  // Optimistic star toggle — update cache immediately, then persist
  const toggleFavourite = (e, ex) => {
    e.stopPropagation();
    // Optimistic update
    queryClient.setQueryData(["exercises"], (old) =>
      old ? old.map(x => x.id === ex.id ? { ...x, is_favourite: !x.is_favourite } : x) : old
    );
    base44.entities.Exercise.update(ex.id, { is_favourite: !ex.is_favourite });
  };

  const handleDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    await base44.entities.Exercise.delete(exerciseToDelete.id);
    queryClient.invalidateQueries({ queryKey: ["exercises"] });
    setExerciseToDelete(null);
    setSelectedExercise(null);
  };

  let filtered = exercises.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.sort === "favourites" && !ex.is_favourite) return false;
    // Direct sub-muscle filter from muscle map click — exact match only
    if (filters.subMuscle) {
      const primary = ex.primary_muscle?.toLowerCase().trim() || "";
      if (primary !== filters.subMuscle.toLowerCase().trim()) return false;
    } else if (filters.muscleGroups.length > 0) {
      const selectedChildren = [];
      filters.muscleGroups.forEach(group => {
        selectedChildren.push(...(MUSCLE_HIERARCHY[group] || []));
      });
      const primaryMuscle = ex.primary_muscle?.toLowerCase().trim() || "";
      const hasMatch = selectedChildren.some(child => child.toLowerCase().trim() === primaryMuscle);
      if (!hasMatch) return false;
    }
    if (filters.equipment.length > 0) {
      const eqKey = ex.category?.toLowerCase().replace(" ", "_");
      if (!filters.equipment.includes(eqKey)) return false;
    }
    return true;
  });

  if (filters.sort === "frequency") {
    filtered = [...filtered].sort((a, b) => (freqMap[b.id] || 0) - (freqMap[a.id] || 0));
  }

  const EQUIPMENT_ABBREVIATIONS = {
    "barbell": "BB",
    "dumbbell": "DB",
    "machine": "MC",
    "smith_machine": "SM",
    "cable": "CA",
    "bodyweight": "BW",
    "band": "BD",
    "other": "--",
  };

  const useGroups = !filters.sort || filters.sort === "name" || filters.sort === "favourites";
  const grouped = {};
  filtered.forEach(ex => {
    const key = useGroups ? (ex.name[0]?.toUpperCase() || "#") : "Results";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ex);
  });
  const sortedKeys = useGroups ? Object.keys(grouped).sort() : ["Results"];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0 rounded-xl h-10" />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1 h-10 px-3 rounded-xl text-xs shrink-0">
          <Plus className="w-3.5 h-3.5" /> New
        </Button>
      </div>
      {filters.subMuscle && (
        <div className="flex items-center gap-2 py-1">
          <span className="text-xs bg-primary/15 text-primary rounded-full px-3 py-1 font-semibold flex items-center gap-1.5">
            {filters.subMuscle}
            <button onClick={() => setFilters(f => ({ ...f, subMuscle: null }))} className="ml-1 text-primary/70 hover:text-primary font-bold">×</button>
          </span>
          <span className="text-xs text-muted-foreground">from Muscle Map</span>
        </div>
      )}
      <ExerciseFilters filters={filters} onFiltersChange={f => setFilters(prev => ({ ...f, subMuscle: prev.subMuscle }))} />

      {isLoading ? (
        <div className="space-y-2">{Array(6).fill(0).map((_, i) => <div key={i} className="h-14 bg-secondary/50 rounded-xl animate-in fade-in duration-700 repeat-infinite" style={{animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'}} />)}</div>
      ) : (
        <div>
          {sortedKeys.map(key => (
            <div key={key}>
              {useGroups && (
                <div className="py-1.5">
                  <span className="text-xs font-bold text-primary">{key}</span>
                </div>
              )}
              {grouped[key]?.map(ex => {
                const primaryMuscle = ex.primary_muscle?.replace(/_/g, " ") || "Unknown";
                const equipmentAbbr = EQUIPMENT_ABBREVIATIONS[ex.category?.toLowerCase()] || "--";
                return (
                <button key={ex.id} onClick={() => setSelectedExercise(ex)}
                   className="w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-secondary/50 transition-colors text-left">
                   <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                     <MuscleGroupIcon muscle={ex.primary_muscle} size={16} className="text-muted-foreground" />
                   </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {primaryMuscle}
                      {freqMap[ex.id] ? ` · ${freqMap[ex.id]}×` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-md">
                      {equipmentAbbr}
                    </span>
                    <button
                      onClick={(e) => toggleFavourite(e, ex)}
                      className="p-1 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
                    >
                      <Star className={`w-4 h-4 ${ex.is_favourite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                    </button>
                  </div>
                </button>
                );
               })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Library className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No exercises found</p>
            </div>
          )}
        </div>
      )}
      <CreateExerciseModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ExerciseDetailModal exercise={selectedExercise} isOpen={!!selectedExercise} onClose={() => setSelectedExercise(null)} workoutLogs={workoutLogs} onDelete={(ex) => setExerciseToDelete(ex)} />

      {/* Delete exercise confirmation */}
      {exerciseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center"
          onClick={() => setExerciseToDelete(null)}>
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-base">Delete "{exerciseToDelete.name}"?</h3>
              <p className="text-sm text-muted-foreground mt-1">This will permanently delete this exercise and cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setExerciseToDelete(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
              <button onClick={handleDeleteExercise} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Lifts() {
   const [tab, setTab] = useState(TABS.WORKOUTS);
   const [showAiCoach, setShowAiCoach] = useState(false);
   const location = useLocation();
   const navigate = useNavigate();
   const queryClient = useQueryClient();

   const handleRefresh = async () => {
     await Promise.all([
       queryClient.invalidateQueries({ queryKey: ["templates"] }),
       queryClient.invalidateQueries({ queryKey: ["folders"] }),
     ]);
   };
  const { startWorkout } = useActiveWorkout();
  const touchStartX = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "exercises") {
      setTab(TABS.EXERCISES);
    } else if (location.state?.activeTab) {
      setTab(location.state.activeTab);
    }
  }, [location.search, location.state]);

  const { data: folders = [] } = useWorkoutFolders();
  const { data: templates = [] } = useWorkoutTemplates();

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 60) {
      if (diff < 0) setTab(TABS.EXERCISES);
      else setTab(TABS.WORKOUTS);
    }
    touchStartX.current = null;
  };

  return (
     <PullToRefresh onRefresh={handleRefresh}>
     <div className="max-w-lg mx-auto pb-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
       {/* Sticky Header */}
       <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-3 border-b border-border/20">
         <div className="flex items-center justify-center gap-4">
           {/* Toggle — truly centered */}
           <div className="flex bg-secondary rounded-xl p-1 shrink-0">
             <button onClick={() => setTab(TABS.WORKOUTS)}
               className={`px-6 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === TABS.WORKOUTS ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
               Workouts
             </button>
             <button onClick={() => setTab(TABS.EXERCISES)}
               className={`px-6 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === TABS.EXERCISES ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
               Exercises
             </button>
           </div>
           {/* Right icons */}
           <div className="flex items-center gap-1 ml-auto">
             <Link to={createPageUrl("Calculator")}>
               <Button variant="ghost" size="icon" className="h-10 w-10">
                 <Calculator className="w-6 h-6" />
               </Button>
             </Link>
             <Link to={createPageUrl("WorkoutHistory")}>
               <Button variant="ghost" size="icon" className="h-10 w-10">
                 <History className="w-6 h-6" />
               </Button>
             </Link>
           </div>
         </div>
       </div>

      <div className="px-4">
        <div className="pt-3">
          {tab === TABS.WORKOUTS ? (
            <WorkoutsTab folders={folders} templates={templates} queryClient={queryClient} navigate={navigate} startWorkout={startWorkout} setShowAiCoach={setShowAiCoach} />
          ) : (
            <ExercisesTab />
          )}
        </div>
        </div>
        </div>

      {/* AI Coach Coming Soon Modal */}
      {showAiCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAiCoach(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-2xl p-8 w-full max-w-xs shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold mb-2">AI Coach</h2>
            <p className="text-sm text-muted-foreground mb-6">Personalized workout recommendations, form tips, and progress insights — coming soon!</p>
            <button
              onClick={() => setShowAiCoach(false)}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:opacity-80"
            >
              Got it
            </button>
          </div>
        </div>
      )}
        </PullToRefresh>
        );
        }