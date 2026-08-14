import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import FoodEmojiPickerModal from "@/components/macros/FoodEmojiPickerModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-secondary/50 hover:bg-secondary/70 transition-colors"
      >
        <p className="text-sm font-semibold">{title}</p>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function NumericInput({ label, value, onChange, unit = "", required = false, color = null }) {
  return (
    <div className="flex items-center gap-2 bg-muted hover:bg-muted/80 rounded-md px-2.5 py-1.5 transition-colors">
      <span className={`text-xs font-bold w-20 shrink-0 ${color ? "text-white" : "text-muted-foreground"}`} style={color ? { color } : {}}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </span>
      <Input
        type="number"
        placeholder="0"
        step="0.1"
        value={value}
        onChange={onChange}
        className="flex-1 bg-background border-0 text-right font-semibold h-6 p-0 focus:ring-0 text-xs rounded-sm"
      />
      {unit && <span className="text-[9px] text-muted-foreground w-6 shrink-0 text-right">{unit}</span>}
    </div>
  );
}

function MacroDropdown({ title, value, onChange, unit, color, expanded, onToggle, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 bg-secondary/60 hover:bg-secondary/80 rounded-md px-2.5 py-1.5 transition-colors"
      >
        <span className="text-xs font-bold w-20 shrink-0" style={color ? { color } : {}}>{title}</span>
        <Input
          type="number"
          placeholder="0"
          step="0.1"
          value={value}
          onChange={onChange}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-background border-0 text-right font-semibold h-6 p-0 focus:ring-0 text-xs rounded-sm"
        />
        <span className="text-[9px] text-muted-foreground w-6 shrink-0 text-right">{unit}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <div className="mt-1.5 pl-5 space-y-1.5">{children}</div>}
    </div>
  );
}

export default function CreateFoodModal({ onClose, onCreate, prefill = null }) {
  const [form, setForm] = useState({
    icon: prefill?.icon || "🍎",
    name: prefill?.name || "",
    brand: prefill?.brand || "",
    serving_description: prefill?.serving_description || "",
    serving_size: prefill?.serving_size || 100,
    serving_unit: prefill?.serving_unit || "g",
    portion_quantity: prefill?.portion_quantity || "",
    portion_fraction: prefill?.portion_fraction || "",
    portion_unit: prefill?.portion_unit || "serving",
    calories_per_100g: prefill?.calories_per_100g || "",
    protein_per_100g: prefill?.protein_per_100g || "",
    carbs_per_100g: prefill?.carbs_per_100g || "",
    fat_per_100g: prefill?.fat_per_100g || "",
    fiber_per_100g: prefill?.fiber_per_100g || "",
    sugar_per_100g: prefill?.sugar_per_100g || "",
    saturated_fat_per_100g: prefill?.saturated_fat_per_100g || "",
    trans_fat_per_100g: prefill?.trans_fat_per_100g || "",
    polyunsaturated_fat_per_100g: prefill?.polyunsaturated_fat_per_100g || "",
    monounsaturated_fat_per_100g: prefill?.monounsaturated_fat_per_100g || "",
    sodium_per_100g: prefill?.sodium_per_100g || "",
    potassium_per_100g: prefill?.potassium_per_100g || "",
    cholesterol_per_100g: prefill?.cholesterol_per_100g || "",
    vitamin_a: prefill?.vitamin_a || "",
    vitamin_c: prefill?.vitamin_c || "",
    vitamin_d: prefill?.vitamin_d || "",
    vitamin_e: prefill?.vitamin_e || "",
    vitamin_k: prefill?.vitamin_k || "",
    calcium: prefill?.calcium || "",
    iron: prefill?.iron || "",
    magnesium: prefill?.magnesium || "",
    zinc: prefill?.zinc || "",
    phosphorus: prefill?.phosphorus || "",
    selenium: prefill?.selenium || "",
    folate: prefill?.folate || "",
    b12: prefill?.b12 || "",
  });

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [expandedMacros, setExpandedMacros] = useState({
    protein: false,
    carbs: false,
    fat: false,
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const errors = [];
  if (!form.name) errors.push("Food name");
  if (!form.calories_per_100g) errors.push("Calories");
  if (!form.protein_per_100g) errors.push("Protein");
  if (!form.carbs_per_100g) errors.push("Carbohydrates");
  if (!form.fat_per_100g) errors.push("Fat");

  const handleSave = () => {
    const data = {
      icon: form.icon,
      name: form.name,
      brand: form.brand || null,
      serving_description: form.serving_description || null,
      serving_size: parseFloat(form.serving_size) || 100,
      serving_unit: form.serving_unit || "g",
      portion_quantity: parseFloat(form.portion_quantity) || 1,
      portion_fraction: form.portion_fraction || 0,
      portion_unit: form.portion_unit || "serving",
      calories_per_100g: parseFloat(form.calories_per_100g) || 0,
      protein_per_100g: parseFloat(form.protein_per_100g) || 0,
      carbs_per_100g: parseFloat(form.carbs_per_100g) || 0,
      fat_per_100g: parseFloat(form.fat_per_100g) || 0,
      fiber_per_100g: parseFloat(form.fiber_per_100g) || 0,
      sugar_per_100g: parseFloat(form.sugar_per_100g) || 0,
      saturated_fat_per_100g: parseFloat(form.saturated_fat_per_100g) || 0,
      trans_fat_per_100g: parseFloat(form.trans_fat_per_100g) || 0,
      polyunsaturated_fat_per_100g: parseFloat(form.polyunsaturated_fat_per_100g) || 0,
      monounsaturated_fat_per_100g: parseFloat(form.monounsaturated_fat_per_100g) || 0,
      sodium_per_100g: parseFloat(form.sodium_per_100g) || 0,
      potassium_per_100g: parseFloat(form.potassium_per_100g) || 0,
      cholesterol_per_100g: parseFloat(form.cholesterol_per_100g) || 0,
      vitamin_a: form.vitamin_a ? parseFloat(form.vitamin_a) : 0,
      vitamin_c: form.vitamin_c ? parseFloat(form.vitamin_c) : 0,
      vitamin_d: form.vitamin_d ? parseFloat(form.vitamin_d) : 0,
      vitamin_e: form.vitamin_e ? parseFloat(form.vitamin_e) : 0,
      vitamin_k: form.vitamin_k ? parseFloat(form.vitamin_k) : 0,
      calcium: form.calcium ? parseFloat(form.calcium) : 0,
      iron: form.iron ? parseFloat(form.iron) : 0,
      magnesium: form.magnesium ? parseFloat(form.magnesium) : 0,
      zinc: form.zinc ? parseFloat(form.zinc) : 0,
      phosphorus: form.phosphorus ? parseFloat(form.phosphorus) : 0,
      selenium: form.selenium ? parseFloat(form.selenium) : 0,
      folate: form.folate ? parseFloat(form.folate) : 0,
      b12: form.b12 ? parseFloat(form.b12) : 0,
    };
    onCreate(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full bg-background rounded-t-2xl max-h-[90vh] overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-4 py-4 border-b border-border bg-background/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            {prefill?.image_url && (
              <img
                src={prefill.image_url}
                alt=""
                className="w-9 h-9 rounded-lg object-cover border border-border"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <h1 className="text-lg font-bold">Create Food</h1>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4 space-y-4">
          {/* Food Info & Icon Selector */}
          <div className="flex gap-3">
            {/* Icon Picker - LEFT SIDE */}
            <button
              onClick={() => setShowIconPicker(true)}
              className="w-20 h-20 bg-muted hover:bg-muted/80 rounded-lg flex items-center justify-center text-4xl transition-colors shrink-0 border border-border"
            >
              {form.icon}
            </button>

            {/* Food Information */}
            <div className="flex-1 border border-border rounded-lg overflow-hidden">
              <div className="p-3 bg-secondary/50 space-y-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-0.5 block">
                    Food Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Bread"
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    className="bg-secondary border-0 h-9 rounded-md font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-0.5 block">Brand</label>
                  <Input
                    placeholder="e.g., Kirkland"
                    value={form.brand}
                    onChange={e => set("brand", e.target.value)}
                    className="bg-secondary border-0 h-9 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Serving Information */}
          <CollapsibleSection title="Serving Size" defaultOpen={true}>
           <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 -mt-2">
             {/* Base serving size number */}
             <Input
               type="number"
               placeholder="100"
               step="1"
               value={form.serving_size}
               onChange={e => set("serving_size", e.target.value)}
               className="w-14 bg-background border-0 h-7 rounded-md text-xs font-semibold text-right p-0 focus:ring-0"
             />

             {/* g/ml dropdown */}
             <Select value={form.serving_unit} onValueChange={val => set("serving_unit", val)}>
               <SelectTrigger className="w-10 h-7 rounded-md bg-background border-0 text-xs p-0 px-1 focus:ring-0">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="g">g</SelectItem>
                 <SelectItem value="ml">ml</SelectItem>
               </SelectContent>
             </Select>

             {/* Separator */}
             <span className="text-muted-foreground text-xs shrink-0">|</span>

             {/* Portion quantity dropdown */}
             <Select value={form.portion_quantity} onValueChange={val => set("portion_quantity", val)}>
               <SelectTrigger className="w-14 h-7 rounded-md bg-background border-0 text-xs p-0 px-1 focus:ring-0">
                 <SelectValue placeholder="-" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={null}>-</SelectItem>
                 {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map(num => (
                   <SelectItem key={num} value={num}>{num}</SelectItem>
                 ))}
               </SelectContent>
             </Select>

             {/* Fraction dropdown */}
             <Select value={String(form.portion_fraction)} onValueChange={val => {
               if (val === "") {
                 set("portion_fraction", "");
               } else {
                 const fractionMap = {"0": 0, "0.16666666666666666": 1/6, "0.25": 1/4, "0.3333333333333333": 1/3, "0.5": 1/2, "0.6666666666666666": 2/3, "0.75": 3/4, "0.8333333333333334": 5/6};
                 set("portion_fraction", fractionMap[val]);
               }
             }}>
               <SelectTrigger className="w-14 h-7 rounded-md bg-background border-0 text-xs p-0 px-1 focus:ring-0">
                 <SelectValue placeholder="-" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={null}>-</SelectItem>
                 <SelectItem value="0">0</SelectItem>
                 <SelectItem value="0.16666666666666666">1/6</SelectItem>
                 <SelectItem value="0.25">1/4</SelectItem>
                 <SelectItem value="0.3333333333333333">1/3</SelectItem>
                 <SelectItem value="0.5">1/2</SelectItem>
                 <SelectItem value="0.6666666666666666">2/3</SelectItem>
                 <SelectItem value="0.75">3/4</SelectItem>
                 <SelectItem value="0.8333333333333334">5/6</SelectItem>
               </SelectContent>
             </Select>

             {/* Serving type dropdown */}
             <Select value={form.portion_unit} onValueChange={val => set("portion_unit", val)}>
               <SelectTrigger className="w-20 h-7 rounded-md bg-background border-0 text-xs p-1 focus:ring-0">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="serving">Serving</SelectItem>
                 <SelectItem value="cup">Cup</SelectItem>
                 <SelectItem value="tablespoon">Tablespoon</SelectItem>
                 <SelectItem value="teaspoon">Teaspoon</SelectItem>
                 <SelectItem value="piece">Piece</SelectItem>
                 <SelectItem value="slice">Slice</SelectItem>
               </SelectContent>
             </Select>
           </div>
          </CollapsibleSection>

          {/* Macronutrients */}
          <div className="space-y-2">
           <p className="text-xs font-semibold text-muted-foreground px-0.5">Per serving</p>
           <div className="space-y-2">
             <NumericInput
               label="Calories"
               value={form.calories_per_100g}
               onChange={e => set("calories_per_100g", e.target.value)}
               unit="kcal"
               required={true}
               color="#FFD700"
             />
             <NumericInput
               label="Protein"
               value={form.protein_per_100g}
               onChange={e => set("protein_per_100g", e.target.value)}
               unit="g"
               required={false}
               color="#FF0055"
             />
             <MacroDropdown
               title="Carbs"
               value={form.carbs_per_100g}
               onChange={e => set("carbs_per_100g", e.target.value)}
               unit="g"
               color="#00AAFF"
               expanded={expandedMacros.carbs}
               onToggle={() => setExpandedMacros(p => ({ ...p, carbs: !p.carbs }))}
             >
               <NumericInput
                 label="Fiber"
                 value={form.fiber_per_100g}
                 onChange={e => set("fiber_per_100g", e.target.value)}
                 unit="g"
               />
               <NumericInput
                 label="Sugar"
                 value={form.sugar_per_100g}
                 onChange={e => set("sugar_per_100g", e.target.value)}
                 unit="g"
               />
             </MacroDropdown>
             <MacroDropdown
               title="Fat"
               value={form.fat_per_100g}
               onChange={e => set("fat_per_100g", e.target.value)}
               unit="g"
               color="#00CC66"
               expanded={expandedMacros.fat}
               onToggle={() => setExpandedMacros(p => ({ ...p, fat: !p.fat }))}
             >
               <NumericInput
                 label="Saturated"
                 value={form.saturated_fat_per_100g}
                 onChange={e => set("saturated_fat_per_100g", e.target.value)}
                 unit="g"
               />
               <NumericInput
                 label="Trans"
                 value={form.trans_fat_per_100g}
                 onChange={e => set("trans_fat_per_100g", e.target.value)}
                 unit="g"
               />
               <NumericInput
                 label="Polyunsat"
                 value={form.polyunsaturated_fat_per_100g}
                 onChange={e => set("polyunsaturated_fat_per_100g", e.target.value)}
                 unit="g"
               />
               <NumericInput
                 label="Monounsat"
                 value={form.monounsaturated_fat_per_100g}
                 onChange={e => set("monounsaturated_fat_per_100g", e.target.value)}
                 unit="g"
               />
             </MacroDropdown>
             <NumericInput
               label="Sodium"
               value={form.sodium_per_100g}
               onChange={e => set("sodium_per_100g", e.target.value)}
               unit="mg"
               color="#9370DB"
             />
             <NumericInput
               label="Cholesterol"
               value={form.cholesterol_per_100g}
               onChange={e => set("cholesterol_per_100g", e.target.value)}
               unit="mg"
               color="#FF6B6B"
             />
           </div>
          </div>

          {/* Micronutrients */}
          <CollapsibleSection title="Micronutrients" defaultOpen={false}>
            <div className="space-y-1.5">
              <NumericInput label="Vitamin A" value={form.vitamin_a} onChange={e => set("vitamin_a", e.target.value)} unit="IU" />
              <NumericInput label="Vitamin C" value={form.vitamin_c} onChange={e => set("vitamin_c", e.target.value)} unit="mg" />
              <NumericInput label="Vitamin D" value={form.vitamin_d} onChange={e => set("vitamin_d", e.target.value)} unit="IU" />
              <NumericInput label="Vitamin E" value={form.vitamin_e} onChange={e => set("vitamin_e", e.target.value)} unit="mg" />
              <NumericInput label="Vitamin K" value={form.vitamin_k} onChange={e => set("vitamin_k", e.target.value)} unit="μg" />
              <NumericInput label="Calcium" value={form.calcium} onChange={e => set("calcium", e.target.value)} unit="mg" />
              <NumericInput label="Iron" value={form.iron} onChange={e => set("iron", e.target.value)} unit="mg" />
              <NumericInput label="Magnesium" value={form.magnesium} onChange={e => set("magnesium", e.target.value)} unit="mg" />
              <NumericInput label="Zinc" value={form.zinc} onChange={e => set("zinc", e.target.value)} unit="mg" />
              <NumericInput label="Phosphorus" value={form.phosphorus} onChange={e => set("phosphorus", e.target.value)} unit="mg" />
              <NumericInput label="Selenium" value={form.selenium} onChange={e => set("selenium", e.target.value)} unit="μg" />
              <NumericInput label="Folate" value={form.folate} onChange={e => set("folate", e.target.value)} unit="μg" />
              <NumericInput label="B12" value={form.b12} onChange={e => set("b12", e.target.value)} unit="μg" />
            </div>
          </CollapsibleSection>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-destructive">Missing required fields:</p>
              <p className="text-xs text-destructive/80 mt-1">{errors.join(", ")}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 px-4 py-3 border-t border-border bg-background/95 backdrop-blur">
          <Button variant="outline" className="flex-1 rounded-md text-sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-md font-semibold text-sm"
            disabled={errors.length > 0}
            onClick={handleSave}
          >
            Save Food
          </Button>
        </div>

        {/* Food Icon Picker Modal */}
        <FoodEmojiPickerModal
          open={showIconPicker}
          current={form.icon}
          onSelect={(icon) => {
            set("icon", icon);
            setShowIconPicker(false);
          }}
          onClose={() => setShowIconPicker(false)}
        />
      </motion.div>
    </motion.div>
  );
}