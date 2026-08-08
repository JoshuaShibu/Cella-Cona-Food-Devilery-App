/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface DishDetail {
  id: number;
  dish_id: number;
  calories: number | null;
  ingredients: string | null;
  allergens: string | null;
  prep_time_minutes: number | null;
}

export interface Dish {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  cuisine: string | null;
  tag: string | null;
  tags: string | null;
  rating: number | null;
  image_url: string | null;
  is_available: boolean;
  spice_level: number;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  meal_times: string | null;
  temp_affinity: string | null;
  order_count: number;
  details: DishDetail | null;
}

export interface DishFilters {
  category?: string;
  cuisine?: string;
  tag?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  max_spice?: number;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  is_available?: boolean;
  sort_by?: "name" | "price" | "rating" | "order_count";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface DishFacets {
  categories: string[];
  cuisines: string[];
  tags: string[];
  price_range: { min: number; max: number };
  spice_levels: number[];
  sort_options: string[];
  total_dishes: number;
}

export interface RecommendationSignals {
  content: number;
  collaborative: number;
  popularity: number;
  context_multiplier: number;
}

export interface Recommendation {
  dish: Dish;
  score: number;
  reasons: string[];
  signals: RecommendationSignals;
}

export interface RecommendationResponse {
  context: {
    user_id: number | null;
    meal_time: string | null;
    weather: string | null;
    day_of_week: number | null;
  };
  strategy: string;
  results: Recommendation[];
}

export interface SimilarDish {
  dish: Dish;
  score: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  needs_gluten_free: boolean;
  allergens: string | null;
  spice_tolerance: number;
  avg_budget: number;
  created_at: string;
}

export interface Interaction {
  id: number;
  user_id: number;
  dish_id: number;
  rating: number | null;
  quantity: number;
  ordered_at: string;
  meal_time: string | null;
  day_of_week: number | null;
  weather: string | null;
}

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;
