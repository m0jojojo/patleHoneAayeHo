const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new ApiError(response.status, (data as { error?: string }).error ?? "Something went wrong");
	}
	return data as T;
}

export function requestOtp(phoneNumber: string): Promise<{ success: true }> {
	return postJson("/auth/otp/request", { phoneNumber });
}

export function verifyOtp(phoneNumber: string, code: string): Promise<{ token: string }> {
	return postJson("/auth/otp/verify", { phoneNumber, code });
}
