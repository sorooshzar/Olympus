import React, { useState } from "react";
import { ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import WorkoutCard from "./WorkoutCard";

const stop = (e) => e.stopPropagation();

export default function FolderCard({
  folder, children = [], folders = [],
  onRenameFolder, onDeleteFolder, onWipeFolder,
  onEditWorkout, onDeleteWorkout, onDuplicateWorkout,
  onArchiveWorkout, onUnarchiveWorkout,
  onMoveToFolder, onUpdateNotes, onStartWorkout, onAddWorkout,
  defaultOpen = true, isArchiveFolder = false,
  // Drag system
  open = true, onToggleOpen, bindBar, dragInfo,
  entranceIndex = 0,
}) {
  const [renaming, setRenaming] = useState(false);
  const isOpen = open;
  const headerDragging = dragInfo?.kind === "folder" && dragInfo?.id === folder.id;

  const headerHandlers = bindBar
    ? bindBar({ kind: "folder", id: folder.id, name: folder.name, sub: String(children.length) })
    : {};

  return (
    <div
      className={`bg-card rounded-xl border border-border overflow-hidden transition-shadow ${
        headerDragging ? "shadow-2xl" : ""
      }`}
      data-lift="top"
      data-lift-kind="folder"
      data-lift-id={folder.id}
      data-lift-isheader="1"
      {...headerHandlers}
      style={{ touchAction: "none", opacity: headerDragging ? 0.45 : 1, transition: "opacity .15s" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: entranceIndex * 0.05, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "transform" }}
      >
        {/* Folder Header */}
        <div className="flex items-center w-full p-3 gap-3">
          <button onClick={(e) => { stop(e); onToggleOpen && onToggleOpen(); }} onPointerDown={stop} className="flex-shrink-0">
            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button
            onClick={(e) => { stop(e); onToggleOpen && onToggleOpen(); }}
            onPointerDown={stop}
            className="flex-1 flex items-center gap-3 min-w-0"
          >
            <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="flex-1 text-left font-semibold text-sm truncate">{folder.name}</span>
            <span className="text-xs text-muted-foreground">{children.length}</span>
          </button>
          <div onPointerDown={stop} onClick={stop}>
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

        {/* Inner workout list */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="folder-content"
              initial={false}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div data-folder-children={folder.id} className="px-3 pb-3 space-y-2">
                {children.length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center">No workouts yet</p>
                )}
                {children.map((template) => {
                  const setCount = template.exercises?.reduce((a, ex) => a + (ex.sets?.filter(s => s.type !== "warmup").length || 0), 0) || 0;
                  const isItemDragging = dragInfo?.kind === "workout" && dragInfo?.id === template.id;
                  const handlers = bindBar
                    ? bindBar({ kind: "workout", id: template.id, name: template.name, sub: `${setCount} ${setCount === 1 ? "Set" : "Sets"}`, accent: template.color, iconName: template.icon })
                    : {};
                  return (
                    <div
                      key={template.id}
                      data-lift="child"
                      data-lift-kind="workout"
                      data-lift-id={template.id}
                      data-lift-folder={folder.id}
                      {...handlers}
                      style={{ touchAction: "none", opacity: isItemDragging ? 0.4 : 1, transition: "opacity .15s" }}
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
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}