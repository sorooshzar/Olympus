import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChefHat, Pencil, Trash2, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import RecipeBuilder from "./RecipeBuilder";

const PROTEIN_COLOR = "#FF0055";
const CARBS_COLOR = "#00AAFF";
const FAT_COLOR = "#00CC66";
const KCAL_COLOR = "#FFD700";

function ConfirmDelete({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-xs space-y-4">
        <p className="font-bold text-base text-center">Delete Recipe?</p>
        <p className="text-sm text-muted-foreground text-center">This cannot be undone.</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" className="flex-1 rounded-xl" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

function RecipeLogSheet({ recipe, onLog, onClose }) {
  const totalServings = recipe.servings || 1;
  const [count, setCount] = useState(1);
  const [meal, setMeal] = useState(null);

  const perCal = (recipe.total_calories || 0) / totalServings;
  const perProtein = (recipe.total_protein || 0) / totalServings;
  const perCarbs = (recipe.total_carbs || 0) / totalServings;
  const perFat = (recipe.total_fat || 0) / totalServings;

  const cal = Math.round(perCal * count);
  const protein = Math.round(perProtein * count * 10) / 10;
  const carbs = Math.round(perCarbs * count * 10) / 10;
  const fat = Math.round(perFat * count * 10) / 10;

  const meals = [
    { key: "breakfast", label: "Breakfast", icon: "🍳" },
    { key: "lunch", label: "Lunch", icon: "🥗" },
    { key: "dinner", label: "Dinner", icon: "🍽️" },
    { key: "snack", label: "Snack", icon: "🍎" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-lg bg-card rounded-t-3xl border-t border-border/40 p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="w-9 h-1 bg-muted-foreground/25 rounded-full mx-auto -mt-1" />
        <div className="flex items-center justify-between">
          <p className="font-bold text-base truncate">{recipe.icon} {recipe.name}</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">How many servings?
            {totalServings > 1 && <span className="ml-1 text-primary font-semibold">({totalServings} total)</span>}
          </p>
          <div className="flex items-center justify-center gap-6 py-1">
            <button onClick={() => setCount(c => Math.max(0.5, +(c - 0.5).toFixed(1)))}
              className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold">−</button>
            <span className="text-4xl font-black w-16 text-center">{count}</span>
            <button onClick={() => setCount(c => Math.min(99, +(c + 0.5).toFixed(1)))}
              className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">+</button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 bg-secondary rounded-xl p-3">
          <span className="text-xs font-black" style={{ color: KCAL_COLOR }}>🔥{cal} kcal</span>
          <span className="text-xs font-bold" style={{ color: PROTEIN_COLOR }}>P:{protein}g</span>
          <span className="text-xs font-bold" style={{ color: CARBS_COLOR }}>C:{carbs}g</span>
          <span className="text-xs font-bold" style={{ color: FAT_COLOR }}>F:{fat}g</span>
        </div>
        <p className="text-[11px] text-muted-foreground text-center -mt-2">
          {count} serving{count !== 1 ? "s" : ""} = {cal} cal · P: {protein}g · C: {carbs}g · F: {fat}g
        </p>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Log to which meal?</p>
          <div className="grid grid-cols-2 gap-2">
            {meals.map(m => (
              <button key={m.key} onClick={() => setMeal(m.key)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  meal === m.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-foreground border-border"
                }`}>
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full h-12 rounded-xl font-bold" disabled={!meal}
          onClick={() => onLog(count, meal)}>
          {meal ? `Log to ${meals.find(m => m.key === meal).label}` : "Select a meal"}
        </Button>
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onEdit, onDelete, onLog }) {
  const ingredientPreview = (recipe.ingredients || []).slice(0, 3).map(i => i.food_name).join(", ");
  const moreCount = (recipe.ingredients || []).length - 3;
  const servings = recipe.servings || 1;
  const perCal = Math.round((recipe.total_calories || 0) / servings);
  const perProtein = Math.round((recipe.total_protein || 0) / servings);
  const perCarbs = Math.round((recipe.total_carbs || 0) / servings);
  const perFat = Math.round((recipe.total_fat || 0) / servings);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {recipe.icon && <span className="text-2xl shrink-0 mt-0.5">{recipe.icon}</span>}
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm">{recipe.name}</p>
            {servings > 1 && (
              <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-full">{servings} servings</span>
            )}
          </div>
          {ingredientPreview && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {ingredientPreview}{moreCount > 0 ? ` +${moreCount} more` : ""}
            </p>
          )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(recipe)} className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary hover:bg-border transition-colors">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => onDelete(recipe)} className="w-7 h-7 flex items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-xs font-black" style={{ color: KCAL_COLOR }}>🔥{perCal} kcal</span>
        <span className="text-[10px] font-bold" style={{ color: PROTEIN_COLOR }}>P:{perProtein}g</span>
        <span className="text-[10px] font-bold" style={{ color: CARBS_COLOR }}>C:{perCarbs}g</span>
        <span className="text-[10px] font-bold" style={{ color: FAT_COLOR }}>F:{perFat}g</span>
        <div className="flex-1" />
        <button onClick={() => onLog(recipe)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-primary/90 transition-colors active:scale-[0.97] shrink-0">
          <Zap className="w-3.5 h-3.5" /> Log
        </button>
      </div>
    </div>
  );
}

export default function RecipesTab({ date, addingMeal, onAdd, onClearMeal }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [deletingRecipe, setDeletingRecipe] = useState(null);
  const [loggingRecipe, setLoggingRecipe] = useState(null);
  const queryClient = useQueryClient();

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Recipe.filter({ created_by: user.email }, "-created_date", 100);
    },
  });

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["recipes"] });
    setShowBuilder(false);
    setEditingRecipe(null);
  };

  const handleDelete = async () => {
    await base44.entities.Recipe.delete(deletingRecipe.id);
    queryClient.invalidateQueries({ queryKey: ["recipes"] });
    setDeletingRecipe(null);
  };

  const handleLog = async (recipe, servingCount, mealType) => {
    const totalServings = recipe.servings || 1;
    const factor = servingCount / totalServings;
    await base44.entities.MacroEntry.create({
      date,
      meal_type: mealType,
      food_name: recipe.name,
      food_id: recipe.id,
      quantity: servingCount,
      unit: "serving",
      calories: Math.round((recipe.total_calories || 0) * factor),
      protein: Math.round((recipe.total_protein || 0) * factor * 10) / 10,
      carbs: Math.round((recipe.total_carbs || 0) * factor * 10) / 10,
      fat: Math.round((recipe.total_fat || 0) * factor * 10) / 10,
    });
    queryClient.invalidateQueries({ queryKey: ["macroEntries", date] });
    if (onClearMeal) onClearMeal();
    setLoggingRecipe(null);
  };

  return (
    <div className="space-y-3 pt-1">
      {addingMeal && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl px-3 py-2">
          <p className="text-xs font-semibold text-primary">Logging to <span className="capitalize">{addingMeal}</span></p>
          <button onClick={onClearMeal} className="text-[10px] text-muted-foreground underline">cancel</button>
        </div>
      )}

      <button onClick={() => { setEditingRecipe(null); setShowBuilder(true); }}
        className="w-full h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-primary/15">
        <Plus className="w-4 h-4" /> Create Recipe
      </button>

      {recipes.length === 0 ? (
        <div className="text-center py-14">
          <ChefHat className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold mb-1">No recipes yet</p>
          <p className="text-xs text-muted-foreground">Build it once, log it in one tap forever.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recipes.map(r => (
            <RecipeCard key={r.id} recipe={r}
              onEdit={(r) => { setEditingRecipe(r); setShowBuilder(true); }}
              onDelete={setDeletingRecipe}
              onLog={setLoggingRecipe}
            />
          ))}
        </div>
      )}

      {showBuilder && (
        <RecipeBuilder
          recipe={editingRecipe}
          onClose={() => { setShowBuilder(false); setEditingRecipe(null); }}
          onSaved={handleSaved}
        />
      )}

      {deletingRecipe && (
        <ConfirmDelete onConfirm={handleDelete} onCancel={() => setDeletingRecipe(null)} />
      )}

      {loggingRecipe && (
        <RecipeLogSheet
          recipe={loggingRecipe}
          onLog={(count, mealType) => handleLog(loggingRecipe, count, mealType)}
          onClose={() => setLoggingRecipe(null)}
        />
      )}
    </div>
  );
}