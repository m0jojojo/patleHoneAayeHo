import { getSessionToken } from '../auth/session';

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

export interface Recommendation {
  type: 'addition';
  proteinType: string;
  proteinLabel: string;
  source: 'explicit' | 'history' | 'default';
  message: string;
  remainingProteinG: number;
}

export function getCurrentRecommendation(): Promise<{ recommendation: Recommendation | null }> {
  return authedRequest('/recommendations/current');
}

export function dismissRecommendation(proteinType: string): Promise<{ success: true }> {
  return authedRequest('/recommendations/dismiss', {
    method: 'POST',
    body: JSON.stringify({ proteinType }),
  });
}
