const apiUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
import {Dish, DishFacets, DishFilters, Interaction, QueryParams, RecommendationResponse, SimilarDish, User, } from "../types/types"


/* ------------------------------------------------------------------ */
/* Internals                                                           */
/* ------------------------------------------------------------------ */

const buildQuery = (params: QueryParams = {}): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

const request = async <T>(path: string, params: QueryParams = {}): Promise<T> => {
  const response = await fetch(`${apiUrl}${path}${buildQuery(params)}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${path}`);
  }
  return response.json() as Promise<T>;
};

/* ------------------------------------------------------------------ */
/* Dishes                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch dishes. Every filter is optional — calling with no args returns the
 * full menu, matching the previous behaviour.
 */
export const dishesServices = async (
  params: DishFilters = {}
): Promise<Dish[]> =>
  request<Dish[]>("/dishes", { limit: 200, ...params } as QueryParams);

/** Distinct categories, cuisines, tags and price bounds for the filter bar. */
export const dishFacetsService = async (): Promise<DishFacets> =>
  request<DishFacets>("/dishes/facets");

/** Single dish by id. */
export const dishByIdService = async (dishId: number): Promise<Dish> =>
  request<Dish>(`/dishes/${dishId}`);

/** Content-based "you might also like" for a given dish. */
export const similarDishesService = async (
  dishId: number,
  limit = 6
): Promise<SimilarDish[]> =>
  request<SimilarDish[]>(`/dishes/${dishId}/similar`, { limit });

/* ------------------------------------------------------------------ */
/* Recommendations                                                     */
/* ------------------------------------------------------------------ */

export interface RecommendationOptions {
  userId?: number;
  limit?: number;
  mealTime?: "breakfast" | "lunch" | "dinner" | "snack";
  weather?: "cold" | "mild" | "hot";
  tempCelsius?: number;
}

/**
 * Hybrid recommendations. Works without a userId — anonymous visitors get
 * popularity- and context-driven picks instead of personalised ones.
 */
export const recommendationsService = async ({
  userId,
  limit = 8,
  mealTime,
  weather,
  tempCelsius,
}: RecommendationOptions = {}): Promise<RecommendationResponse> =>
  request<RecommendationResponse>("/recommendations", {
    user_id: userId,
    limit,
    meal_time: mealTime,
    weather,
    temp_celsius: tempCelsius,
  });

/* ------------------------------------------------------------------ */
/* Users & interactions                                                */
/* ------------------------------------------------------------------ */

export interface RecordInteractionOptions {
  userId: number;
  dishId: number;
  rating?: number;
  quantity?: number;
  mealTime?: string;
  weather?: string;
}

/** Record an order/rating so future recommendations improve. */
export const recordInteractionService = async ({
  userId,
  dishId,
  rating,
  quantity = 1,
  mealTime,
  weather,
}: RecordInteractionOptions): Promise<Interaction> => {
  const response = await fetch(`${apiUrl}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      dish_id: dishId,
      rating,
      quantity,
      meal_time: mealTime,
      weather,
    }),
  });
  if (!response.ok) throw new Error("Failed to record interaction");
  return response.json() as Promise<Interaction>;
};

export const usersService = async (limit = 50): Promise<User[]> =>
  request<User[]>("/users", { limit });