// Extracts nutrition data from an image of a nutrition facts label using an
// AI vision model, then converts per-serving values to per-100g.
// Receives { file_url } (an uploaded image URL). Returns a Food-shaped object
// (name/brand null — those aren't on the label) or { found: false }.
// Frontend invokes via base44.functions.invoke('parseNutritionLabel', { file_url }).

import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const file_url = body?.file_url;
    if (!file_url) return Response.json({ error: "No image provided" }, { status: 400 });

    // Use -1 as the sentinel for "not present on the label" — union/nullable types
    // are rejected by some structured-output models, so a plain number schema is safest.
    const numField = { type: "number" };
    const schema = {
      type: "object",
      properties: {
        serving_size_grams: numField,
        serving_description: { type: "string" },
        calories: numField,
        protein: numField,
        carbs: numField,
        fat: numField,
        fiber: numField,
        sugar: numField,
        saturated_fat: numField,
        trans_fat: numField,
        polyunsaturated_fat: numField,
        monounsaturated_fat: numField,
        sodium: numField,
        potassium: numField,
        cholesterol: numField,
        vitamin_a: numField,
        vitamin_c: numField,
        vitamin_d: numField,
        vitamin_e: numField,
        vitamin_k: numField,
        calcium: numField,
        iron: numField,
        magnesium: numField,
        zinc: numField,
        phosphorus: numField,
        selenium: numField,
        folate: numField,
        b12: numField,
      },
    };

    const raw: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        "You are a nutrition-label OCR extractor. The image is a nutrition facts panel. " +
        "Extract ALL values exactly as printed, per serving. Return JSON only.\n" +
        "- Use -1 for ANY value that is not present on the label (never guess or invent).\n" +
        "- serving_size_grams: gram weight of ONE serving if stated (e.g. 30 from 'Serving size: 1 cup (30g)'); -1 if not stated.\n" +
        "- serving_description: the full serving-size text as printed; empty string if none.\n" +
        "- calories (kcal), protein, carbs, fat, fiber, sugar (grams).\n" +
        "- saturated_fat, trans_fat, polyunsaturated_fat, monounsaturated_fat (grams).\n" +
        "- sodium, potassium, cholesterol (milligrams).\n" +
        "- vitamins/minerals: numeric value as printed (unit in your reading, return just the number); -1 if absent.\n" +
        "Read carefully and return only the JSON object.",
      file_urls: [file_url],
      response_json_schema: schema,
    });

    if (!raw) return Response.json({ found: false });

    const sv = raw.serving_size_grams;
    const hasServing = sv != null && sv > 0;
    const factor = hasServing ? 100 / sv : null;
    const to100 = (v: any) => {
      if (v == null || v === -1) return null;
      if (!factor) return v;
      return Math.round(Number(v) * factor * 100) / 100;
    };

    return Response.json({
      found: true,
      name: null,
      brand: null,
      serving_description: raw.serving_description || null,
      serving_size: hasServing ? sv : 100,
      calories_per_100g: to100(raw.calories),
      protein_per_100g: to100(raw.protein),
      carbs_per_100g: to100(raw.carbs),
      fat_per_100g: to100(raw.fat),
      fiber_per_100g: to100(raw.fiber),
      sugar_per_100g: to100(raw.sugar),
      saturated_fat_per_100g: to100(raw.saturated_fat),
      trans_fat_per_100g: to100(raw.trans_fat),
      polyunsaturated_fat_per_100g: to100(raw.polyunsaturated_fat),
      monounsaturated_fat_per_100g: to100(raw.monounsaturated_fat),
      sodium_per_100g: to100(raw.sodium),
      potassium_per_100g: to100(raw.potassium),
      cholesterol_per_100g: to100(raw.cholesterol),
      vitamin_a: to100(raw.vitamin_a),
      vitamin_c: to100(raw.vitamin_c),
      vitamin_d: to100(raw.vitamin_d),
      vitamin_e: to100(raw.vitamin_e),
      vitamin_k: to100(raw.vitamin_k),
      calcium: to100(raw.calcium),
      iron: to100(raw.iron),
      magnesium: to100(raw.magnesium),
      zinc: to100(raw.zinc),
      phosphorus: to100(raw.phosphorus),
      selenium: to100(raw.selenium),
      folate: to100(raw.folate),
      b12: to100(raw.b12),
    });
  } catch (error) {
    return Response.json({ found: false, error: error.message }, { status: 500 });
  }
}