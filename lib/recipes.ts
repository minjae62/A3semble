// ============================================================
// 레시피 API 데이터 변환 + 매칭 로직
// 백엔드 GET /api/v1/recipes 응답을 프론트 Recipe 타입으로 변환하고,
// 사용자 재고와 비교하여 매칭률을 계산한다.
// ============================================================
import { getRecipeDetail, getRecipes, type RecipeApi } from "./api";


import type { FridgeItem } from "./inventory-utils";

export type RecipeDifficulty = "easy" | "medium" | "hard";

export type RecipeIngredient = {
  name: string;
  ingredient_master_id?: number;
  quantity: number;
  unit: string;
  optional?: boolean;
};

export type RecipeNutrition = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Recipe = {
  id: number;
  name: string;
  description: string;
  emoji: string;
  cooking_time_min: number;
  difficulty: RecipeDifficulty;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  nutrition?: RecipeNutrition;
  tags?: string[];
};

// ============================================================
// 매칭 결과 — 사용자 보유 재료와 비교한 출력
// ============================================================
export type MatchedIngredient = {
  ingredient: RecipeIngredient;
  inStock: boolean;      // 사용자가 보유 (수량 무관)
  hasEnough: boolean;    // 정량 이상 보유
  inventoryItem?: FridgeItem;
};

export type RecipeMatch = {
  recipe: Recipe;
  matched: MatchedIngredient[];
  /** 필수 재료 중 보유한 비율 (0~1) */
  matchRatio: number;
  /** 임박 재료(yellow/red) 활용 점수 — 정렬용 */
  urgencyScore: number;
  /** "지금 만들 수 있는지" — 필수 재료 100% */
  canCook: boolean;
};

// ============================================================
// 보유 재료 기반 매칭 계산 + α-score 정렬
// ============================================================
export function matchRecipes(
  recipes: Recipe[],
  inventory: FridgeItem[]
): RecipeMatch[] {
  // 이름 기준 인덱스 (수량 합산)
  const inv = new Map<string, FridgeItem>();
  for (const item of inventory) {
    const existing = inv.get(item.name);
    if (existing) {
      inv.set(item.name, {
        ...existing,
        quantity: String(
          (parseFloat(existing.quantity) || 0) + (parseFloat(item.quantity) || 0)
        ),
      });
    } else {
      inv.set(item.name, item);
    }
  }

  return recipes
    .map<RecipeMatch>((recipe) => {
      let urgencyScore = 0;
      const matched: MatchedIngredient[] = recipe.ingredients.map((ing) => {
        const invItem = inv.get(ing.name);
        const inStock = !!invItem;
        const hasEnough = inStock
          ? (parseFloat(invItem!.quantity) || 0) >= ing.quantity
          : false;
        if (inStock && invItem) {
          // urgency: 임박일수록 가산점
          urgencyScore += invItem.score || 0;
        }
        return { ingredient: ing, inStock, hasEnough, inventoryItem: invItem };
      });

      const required = matched.filter(
        (m) =>
          !m.ingredient.optional &&
          m.ingredient.ingredient_master_id !== null &&
          m.ingredient.ingredient_master_id !== undefined
      );
      const requiredMatched = required.filter((m) => m.hasEnough).length;
      const matchRatio = required.length > 0 ? requiredMatched / required.length : 1;
      const canCook = required.every((m) => m.hasEnough);

      return { recipe, matched, matchRatio, urgencyScore, canCook };
    })
    .sort((a, b) => {
      // 1) 만들 수 있는 것 우선
      if (a.canCook !== b.canCook) return a.canCook ? -1 : 1;
      // 2) urgency score 높은 순 (임박 재료 활용)
      if (a.urgencyScore !== b.urgencyScore) return b.urgencyScore - a.urgencyScore;
      // 3) matchRatio 높은 순
      return b.matchRatio - a.matchRatio;
    });
}

// 백엔드 Recipe 응답을 프론트 화면용 Recipe 타입으로 변환한다.
// 현재 백엔드 응답에 description, difficulty, emoji, tags, steps 등이 없어서
// 해당 값들은 프론트에서 기본값으로 채운다.
// 백엔드 Recipe 응답을 프론트 화면용 Recipe 타입으로 변환한다.
// 현재 백엔드 응답에 description, difficulty, emoji, tags, steps, nutrition 등이 없어서
// 해당 값들은 프론트에서 기본값으로 채운다.
function apiRecipeToRecipe(apiRecipe: RecipeApi): Recipe {
  return {
    id: apiRecipe.id,
    name: apiRecipe.name,
    description: "",
    emoji: "🍳",
    cooking_time_min: apiRecipe.cook_time_min,
    difficulty: "easy",
    servings: apiRecipe.servings,
    ingredients: apiRecipe.ingredients.map((ingredient) => ({
      name: ingredient.ingredient_name,
      ingredient_master_id: ingredient.ingredient_master_id,
      quantity: parseFloat(ingredient.quantity) || 0,
      unit: ingredient.unit,
      optional: false,
    })),
    steps:
      apiRecipe.steps
        ?.sort((a, b) => a.step_order - b.step_order)
        .map((step) => step.description) ?? [],
    nutrition: undefined,
    tags: [],
  };
}
// ============================================================
// API 연동
// ============================================================
export async function fetchRecipes(minMatchRate = 0.8): Promise<Recipe[]> {
  const res = await getRecipes(20, minMatchRate);
  return res.data.items.map(apiRecipeToRecipe);
}

export async function fetchRecipe(id: number): Promise<Recipe | null> {
  try {
    const res = await getRecipeDetail(id);
    return apiRecipeToRecipe(res.data);
  } catch {
    return null;
  }
}

// ============================================================
// 난이도 라벨
// ============================================================
export const DIFFICULTY_LABEL: Record<RecipeDifficulty, { label: string; emoji: string }> = {
  easy:   { label: "쉬움",   emoji: "🟢" },
  medium: { label: "보통",   emoji: "🟡" },
  hard:   { label: "어려움", emoji: "🔴" },
};
