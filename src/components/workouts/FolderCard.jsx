import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import WorkoutCard from "./WorkoutCard";

export default function FolderCard({
  folder, templates, folders = [],
  onRenameFolder, onDeleteFolder, onWipeFolder,
  onEditWorkout, onDeleteWorkout, onDuplicateWorkout,
  onArchiveWorkout, onUnarchiveWorkout,
  onMoveToFolder, onUpdateNotes, onStartWorkout, onAddWorkout,
  defaultOpen = true, isArchiveFolder = false,
  // Outer DnD props (whole card is the drag handle)
  draggableProps, dragHandleProps, innerRef, isDragging,
  // Collapse override from parent during outer drag
  forceCollapsed = false,
  // Stagger index for entrance animation
  entranceIndex = 0,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const queryClient = useQueryClient();

  // Sort inner templates locally so we own the order without waiting for refetch
  const [innerTemplates, setInnerTemplates] = useState([]);

  useEffect(() => {
    const sorted = templates
      .filter((t) => t.folder_id === folder.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    setInnerTemplates(sorted);
  }, [templates, folder.id]);

  const isOpen = !forceCollapsed && open;

  const handleInnerDragEnd = async (result) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    // Reorder locally immediately — no flicker
    const reordered = Array.from(innerTemplates);
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const withOrder = reordered.map((t, i) => ({ ...t, order: i }));
    setInnerTemplates(withOrder);

    // Also update React Query cache so other views reflect it
    queryClient.setQueryData(["templates"], (old = []) => {
      if (!old) return old;
      const map = {};
      withOrder.forEach(t => { map[t.id] = t; });
      return old.map(t => map[t.id] ? { ...t, order: map[t.id].order } : t);
    });

    // Persist
    await Promise.all(withOrder.map((t, i) =>
      base44.entities.WorkoutTemplate.update(t.id, { order: i })
    ));
  };

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      className={`bg-card rounded-xl border border-border overflow-hidden transition-all duration-200 ${
        isDragging ? "shadow-2xl opacity-90 scale-[1.02]" : ""
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: entranceIndex * 0.06, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "transform" }}
      >
      {/* Folder Header — entire header is the drag handle for the outer list */}
      <div
        {...dragHandleProps}
        className="flex items-center w-full p-4 gap-3"
        style={{ touchAction: "none" }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="flex-shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 flex items-center gap-3 min-w-0"
        >
          <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="flex-1 text-left font-semibold text-sm truncate">{folder.name}</span>
          <span className="text-xs text-muted-foreground">{innerTemplates.length}</span>
        </button>

        <div onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isArchiveFolder ? (
                <DropdownMenuItem onClick={() => onWipeFolder && onWipeFolder(folder)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Wipe Folder
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onAddWorkout && onAddWorkout(folder)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Workout
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
                    <Pencil className="w-4 h-4 mr-2" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeleteFolder(folder)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Inner workout list with DnD */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="folder-content"
            initial={false}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <DragDropContext onDragEnd={handleInnerDragEnd}>
              <Droppable droppableId={`folder-${folder.id}`}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="px-3 pb-3 space-y-2"
                  >
                    {innerTemplates.length === 0 && (
                      <p className="text-xs text-muted-foreground py-3 text-center">No workouts yet</p>
                    )}
                    {innerTemplates.map((template, index) => (
                      <Draggable key={template.id} draggableId={template.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`transition-shadow ${dragSnapshot.isDragging ? "shadow-xl rounded-lg" : ""}`}
                          >
                            <WorkoutCard
                              template={template}
                              folders={folders}
                              onEdit={onEditWorkout}
                              onDelete={onDeleteWorkout}
                              onDuplicate={onDuplicateWorkout}
                              onArchive={isArchiveFolder ? undefined : onArchiveWorkout}
                              onUnarchive={isArchiveFolder ? onUnarchiveWorkout : undefined}
                              onMoveToFolder={onMoveToFolder}
                              onUpdateNotes={onUpdateNotes}
                              onStart={onStartWorkout}
                              isArchived={isArchiveFolder}
                              dragHandleProps={dragProvided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}