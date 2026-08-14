// Looks up a product by barcode via the free Open Food Facts API (no key needed).
// Returns a Food-shaped object (all values per 100g) or { found: false }.
// Frontend invokes via base44.functions.invoke('lookupBarcodeProduct', { barcode }).

export default async function (req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const barcode = body?.barcode ? String(body.barcode) : null;
    if (!barcode || !/^\d{6,}$/.test(barcode)) {
      return Response.json({ found: false, error: "Invalid barcode" }, { status: 400 });
    }

    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const response = await fetch(url, {
      headers: { "User-Agent": "OlympusApp/1.0", Accept: "application/json" },
    });
    const data: any = await response.json();

    if (data.status !== 1 || !data.product) {
      return Response.json({ found: false });
    }

    const p = data.product;
    const n = p.nutriments || {};

    const val = (key: string) => {
      const v = n[key];
      return v != null && !isNaN(v) ? v : null;
    };

    let calories = null;
    if (n["energy-kcal_100g"] != null) calories = n["energy-kcal_100g"];
    else if (n["energy_100g"] != null) calories = Math.round(n["energy_100g"] / 4.184);

    let image_url: string | null =
      p.image_front_small_url || p.image_small_url || null;
    if (image_url && image_url.startsWith("/")) {
      image_url = "https://images.openfoodfacts.org" + image_url;
    }

    return Response.json({
      found: true,
      name: p.product_name || p.product_name_en || null,
      brand: p.brands || null,
      serving_description: p.serving_size || null,
      serving_size: p.serving_quantity != null ? Number(p.serving_quantity) : null,
      calories_per_100g: calories,
      protein_per_100g: val("proteins_100g"),
      carbs_per_100g: val("carbohydrates_100g"),
      fat_per_100g: val("fat_100g"),
      fiber_per_100g: val("fiber_100g"),
      sugar_per_100g: val("sugars_100g"),
      saturated_fat_per_100g: val("saturated-fat_100g"),
      trans_fat_per_100g: val("trans-fat_100g"),
      polyunsaturated_fat_per_100g: val("polyunsaturated-fat_100g"),
      monounsaturated_fat_per_100g: val("monounsaturated-fat_100g"),
      sodium_per_100g: val("sodium_100g"),
      potassium_per_100g: val("potassium_100g"),
      cholesterol_per_100g: val("cholesterol_100g"),
      vitamin_a: val("vitamin-a_100g"),
      vitamin_c: val("vitamin-c_100g"),
      vitamin_d: val("vitamin-d_100g"),
      vitamin_e: val("vitamin-e_100g"),
      vitamin_k: val("vitamin-k_100g"),
      calcium: val("calcium_100g"),
      iron: val("iron_100g"),
      magnesium: val("magnesium_100g"),
      zinc: val("zinc_100g"),
      phosphorus: val("phosphorus_100g"),
      selenium: val("selenium_100g"),
      folate: val("folate_100g"),
      b12: val("vitamin-b12_100g"),
      barcode,
      image_url,
    });
  } catch (error) {
    return Response.json({ found: false, error: error.message }, { status: 500 });
  }
}