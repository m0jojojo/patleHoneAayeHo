import * as SecureStore from "expo-secure-store";

const SESSION_TOKEN_KEY = "session_token";

export function saveSessionToken(token: string): Promise<void> {
	return SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export function getSessionToken(): Promise<string | null> {
	return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export function clearSessionToken(): Promise<void> {
	return SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}
