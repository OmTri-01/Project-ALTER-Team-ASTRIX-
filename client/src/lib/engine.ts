/* Quiet Eco Utility: the business layer stays separate from UI, using plain-language fallback parsing, transparent scoring, and practical trade-offs. */
import foodsData from "../data/foods.json";
import productsData from "../data/products.json";

export type FoodItem = {
  id: string; name: string; category: string; calories: number; protein: number; carbohydrates: number; fat: number;
  saturatedFat: number; fiber: number; sugar: number; sodium: number; ingredients: string[]; tasteProfile: string[];
  textureProfile: string[]; spiceLevel: number; estimatedCo2e: number; priceCategory: "low" | "medium" | "high";
};
export type ProductItem = {
  id: string; name: string; category: string; material: string; recyclability: number; packagingScore: number;
  durabilityScore: number; estimatedCo2e: number; sustainabilityClaims: string[]; certifications: string[]; price: number;
};
export type FoodIntent = {
  category: string; baseFood: string; taste: string[]; texture: string[]; spiceLevel: number; indulgence: "low" | "medium" | "high";
  healthGoal: "healthier" | "similar" | "indulgent"; sustainabilityGoal: "low" | "medium" | "high"; pricePreference: "low" | "medium" | "high" | "similar";
};
export type ProductIntent = { category: string; material: string; packaging: string; sustainabilityClaims: string[]; attributes: string[] };
export type UserPreferences = { taste: number; health: number; sustainability: number; price: number };
export type FoodRecommendation = FoodItem & { original: FoodItem; tasteMatch: number; nutritionScore: number; nutritionImprovement: number; sustainabilityScore: number; sustainabilityImprovement: number; priceCompatibility: number; finalScore: number; explanation: string };
export type ProductRecommendation = ProductItem & { original: ProductItem; ecoScore: number; ecoBreakdown: { material: number; carbon: number; recyclability: number; packaging: number; durability: number }; ecoImprovement: number; qualityScore: number; priceCompatibility: number; userPreferenceScore: number; claimRisk: "LOW" | "MEDIUM" | "HIGH"; finalScore: number; explanation: string };

export const foods = foodsData as FoodItem[];
export const products = productsData as ProductItem[];
export const defaultPreferences: UserPreferences = { taste: 40, health: 30, sustainability: 20, price: 10 };
export const scoringWeights = { food: { taste: 0.45, health: 0.3, sustainability: 0.15, price: 0.1 }, product: { similarity: 0.3, eco: 0.35, durability: 0.15, price: 0.1, preference: 0.1 } } as const;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const hasAny = (text: string, words: string[]) => words.some((word) => text.includes(word));
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const jaccard = (a: string[] = [], b: string[] = []) => { const safeA = Array.isArray(a) ? a : []; const safeB = Array.isArray(b) ? b : []; const left = Array.from(new Set(safeA.map(normalize))); const right = Array.from(new Set(safeB.map(normalize))); const union = Array.from(new Set(left.concat(right))); if (!union.length) return 50; return clamp(left.filter((item) => right.includes(item)).length / union.length * 100); };

const categoryFromFood = (text: string) => hasAny(text, ["pizza", "burger", "wrap", "flatbread"]) ? "pizza" : hasAny(text, ["snack", "sweet", "dessert", "cookie", "chocolate"]) ? "snack" : hasAny(text, ["breakfast", "oat", "cereal"]) ? "breakfast" : hasAny(text, ["salad", "bowl", "vegetable"]) ? "bowl" : "meal";
export function extractFoodIntent(userInput: string): FoodIntent {
  const text = normalize(userInput);
  const taste = ["cheesy", "spicy", "savory", "sweet", "creamy", "tangy", "smoky", "salty", "greasy", "rich"].filter((word) => text.includes(word));
  const texture = ["crispy", "crunchy", "chewy", "soft", "creamy", "juicy", "light"].filter((word) => text.includes(word));
  const category = categoryFromFood(text);
  return { category, baseFood: category === "pizza" ? "pizza" : category === "snack" ? "snack" : category, taste: taste.length ? taste : ["savory"], texture: texture.length ? texture : ["satisfying"], spiceLevel: hasAny(text, ["spicy", "hot", "jalapeno"]) ? 3 : hasAny(text, ["mild"]) ? 1 : 2, indulgence: hasAny(text, ["greasy", "indulgent", "decadent", "cheesy"]) ? "high" : "medium", healthGoal: hasAny(text, ["healthier", "healthy", "light", "nutritious"]) ? "healthier" : hasAny(text, ["indulgent", "treat"]) ? "indulgent" : "similar", sustainabilityGoal: hasAny(text, ["sustainable", "eco", "planet", "low carbon"]) ? "high" : "medium", pricePreference: hasAny(text, ["cheap", "budget", "affordable"]) ? "low" : "similar" };
}

export function extractProductIntent(userInput: string): ProductIntent {
  const text = normalize(userInput);
  const categories = ["phone_case", "water_bottle", "backpack", "clothing", "household", "personal_care", "cosmetics", "stationery"];
  const category = categories.find((item) => text.includes(item.replace("_", " ")) || text.includes(item.split("_")[0])) || (hasAny(text, ["case"]) ? "phone_case" : hasAny(text, ["bottle"]) ? "water_bottle" : hasAny(text, ["bag", "backpack"]) ? "backpack" : "household");
  const material = ["plastic", "glass", "aluminum", "silicone", "leather", "cotton", "hemp", "bamboo", "recycled", "polyester"].find((item) => text.includes(item)) || "";
  return { category, material, packaging: hasAny(text, ["packaging", "package", "wrapped"]) ? "packaged" : "", sustainabilityClaims: ["eco-friendly", "green", "sustainable", "natural", "planet-friendly", "earth-safe"].filter((claim) => text.includes(claim)), attributes: ["durable", "reusable", "lightweight", "premium", "refillable"].filter((attribute) => text.includes(attribute)) };
}

export function calculateNutritionScore(food: FoodItem) { return clamp(100 - food.calories / 12 - food.sodium / 45 - food.sugar * 1.1 - food.saturatedFat * 2.5 + food.protein * 1.8 + food.fiber * 3); }
export function calculateFoodSustainabilityScore(food: FoodItem) { return clamp(100 - food.estimatedCo2e * 12); }
const findOriginalFood = (intent: FoodIntent) => foods.find((food) => normalize(food.name).includes(intent.baseFood) || normalize(food.category).includes(intent.category)) || foods[0];
const foodTasteMatch = (intent: FoodIntent, candidate: FoodItem) => clamp(jaccard(intent.taste, candidate.tasteProfile) * .72 + jaccard(intent.texture, candidate.textureProfile) * .28 - Math.abs(intent.spiceLevel - candidate.spiceLevel) * 4);
const priceCompatibility = (original: number | string, candidate: number | string) => { if (typeof original === "string" || typeof candidate === "string") return 75; const gap = Math.abs(original - candidate) / Math.max(original, candidate, 1); return clamp(100 - gap * 140); };

export function getFoodCandidates(intent: FoodIntent, original = findOriginalFood(intent)) { return foods.filter((food) => food.id !== original.id).filter((food) => intent.category === "meal" || normalize(food.category).includes(intent.category) || normalize(food.name).includes(intent.baseFood) || foodTasteMatch(intent, food) > 30).slice(0, 30); }
export function recommendFood(intent: FoodIntent, preferences: UserPreferences = defaultPreferences): FoodRecommendation[] {
  const original = findOriginalFood(intent); const candidates = getFoodCandidates(intent, original);
  return candidates.map((food) => { const tasteMatch = foodTasteMatch(intent, food); const nutritionScore = calculateNutritionScore(food); const originalNutrition = calculateNutritionScore(original); const nutritionImprovement = clamp(50 + (nutritionScore - originalNutrition)); const sustainabilityScore = calculateFoodSustainabilityScore(food); const sustainabilityImprovement = clamp(50 + (sustainabilityScore - calculateFoodSustainabilityScore(original))); const price = priceCompatibility(original.priceCategory, food.priceCategory); const finalScore = clamp(tasteMatch * (preferences.taste / 100) + nutritionImprovement * (preferences.health / 100) + sustainabilityImprovement * (preferences.sustainability / 100) + price * (preferences.price / 100)); const explanation = `Keeps a ${(Array.isArray(intent.taste) ? intent.taste : []).join(", ") || "familiar"} profile with a ${nutritionImprovement >= 55 ? "more favorable" : "similar"} nutritional profile and ${sustainabilityImprovement >= 55 ? "lower" : "comparable"} estimated environmental impact.`; return { ...food, original, tasteMatch, nutritionScore, nutritionImprovement, sustainabilityScore, sustainabilityImprovement, priceCompatibility: price, finalScore, explanation }; }).sort((a, b) => b.finalScore - a.finalScore).slice(0, 3);
}

export function calculateEcoScore(product: ProductItem) { const breakdown = { material: clamp(product.material.includes("recycled") || product.material.includes("bamboo") || product.material.includes("hemp") ? 92 : product.material.includes("glass") || product.material.includes("aluminum") ? 78 : 45), carbon: clamp(100 - product.estimatedCo2e * 28), recyclability: product.recyclability, packaging: product.packagingScore, durability: product.durabilityScore }; return { breakdown, score: clamp(breakdown.material * .2 + breakdown.carbon * .25 + breakdown.recyclability * .2 + breakdown.packaging * .15 + breakdown.durability * .2) }; }
export function analyzeClaimRisk(product: ProductItem) { const claims = Array.isArray(product.sustainabilityClaims) ? product.sustainabilityClaims : []; const certs = Array.isArray(product.certifications) ? product.certifications : []; const vague = claims.filter((claim) => ["eco-friendly", "green", "sustainable", "natural", "planet-friendly", "earth-safe"].includes(claim.toLowerCase())); if (!vague.length) return "LOW" as const; if (certs.length || product.recyclability >= 70 || product.packagingScore >= 75) return "MEDIUM" as const; return "HIGH" as const; }
const findOriginalProduct = (intent: ProductIntent) => products.find((product) => product.category === intent.category && (!intent.material || product.material.toLowerCase().includes(intent.material))) || products.find((product) => product.category === intent.category) || products[0];
export function recommendProduct(intent: ProductIntent, preferences: UserPreferences = defaultPreferences): ProductRecommendation[] { const original = findOriginalProduct(intent); const candidates = products.filter((product) => product.id !== original.id && product.category === original.category); const originalEco = calculateEcoScore(original).score; return candidates.map((product) => { const eco = calculateEcoScore(product); const similarity = intent.material && product.material.toLowerCase().includes(intent.material) ? 92 : 65; const ecoImprovement = clamp(50 + eco.score - originalEco); const quality = product.durabilityScore; const price = priceCompatibility(original.price, product.price); const pref = clamp((eco.score * preferences.sustainability + quality * preferences.health + price * preferences.price) / Math.max(preferences.sustainability + preferences.health + preferences.price, 1)); const finalScore = clamp(similarity * scoringWeights.product.similarity + ecoImprovement * scoringWeights.product.eco + quality * scoringWeights.product.durability + price * scoringWeights.product.price + pref * scoringWeights.product.preference); return { ...product, original, ecoScore: eco.score, ecoBreakdown: eco.breakdown, ecoImprovement, qualityScore: quality, priceCompatibility: price, userPreferenceScore: pref, claimRisk: analyzeClaimRisk(product), finalScore, explanation: `Matches the ${original.category.replace(/_/g, " ")} use case while improving the transparent Eco Score by ${Math.max(0, eco.score - originalEco)} points. The trade-off is a ${product.price > original.price ? "higher" : "similar or lower"} listed price.` }; }).sort((a, b) => b.finalScore - a.finalScore).slice(0, 3); }

export function findFoodOriginal(intent: FoodIntent) { return findOriginalFood(intent); }
export function findProductOriginal(intent: ProductIntent) { return findOriginalProduct(intent); }
