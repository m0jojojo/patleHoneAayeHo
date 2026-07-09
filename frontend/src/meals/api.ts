import { getSessionToken } from '../auth/session';
import type { MealType } from './mealTypes';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getSessionToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, (data as { error?: string }).error ?? 'Something went wrong');
  }
  return data as T;
}

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface ScannedDish {
  label: string;
  matched: boolean;
  confidence: number;
  portionMultiplier: number;
  needsDisambiguation: boolean;
  disambiguationQuestion?: string;
  macros?: Macros;
  macrosSource?: 'catalog' | 'estimated';
}

export interface ScanResult {
  visionFailed: boolean;
  dishes: ScannedDish[];
}

export function scanMeal(imageBase64: string): Promise<ScanResult> {
  return authedRequest('/meals/scan', { method: 'POST', body: JSON.stringify({ imageBase64 }) });
}

export function getDishMacros(
  dishName: string,
  options: { oilLevel?: 'low' | 'medium' | 'high'; portionMultiplier?: number } = {},
): Promise<{ macros: Macros }> {
  return authedRequest('/meals/dish-macros', {
    method: 'POST',
    body: JSON.stringify({ dishName, ...options }),
  });
}

export function logMeal(input: {
  dishLabels: string[];
  portionEstimate: unknown;
  macros: Macros;
  mealType: MealType;
}): Promise<{ id: string; showSettingsNudge: boolean }> {
  return authedRequest('/meals/log', { method: 'POST', body: JSON.stringify(input) });
}

export interface LoggedMealSummary {
  id: string;
  timestamp: string;
  dishLabels: string[];
  macros: Macros;
  mealType: MealType;
}

export interface TodaySummary {
  tdee: number;
  targets: Macros;
  consumed: Macros;
  remaining: Macros;
  meals: LoggedMealSummary[];
}

// date, when given, must be "YYYY-MM-DD" - lets the calendar picker load a past day's summary
// instead of always today's.
export function getTodaySummary(date?: string): Promise<TodaySummary> {
  return authedRequest(date ? `/meals/today?date=${date}` : '/meals/today');
}

export function deleteMeal(id: string): Promise<{ success: boolean }> {
  return authedRequest(`/meals/log/${id}`, { method: 'DELETE' });
}

export interface UsualMeal {
  dishLabels: string[];
  frequencyCount: number;
  lastLoggedAt: string;
}

export function getUsualMeals(): Promise<{ usualMeals: UsualMeal[] }> {
  return authedRequest('/meals/usual');
}
