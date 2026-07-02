export async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

// 6-digit numeric OTP, generated via Web Crypto rather than Math.random() since it's a security code.
export function generateOtpCode(): string {
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return (buf[0] % 1_000_000).toString().padStart(6, "0");
}

// 32 random bytes, base64url-encoded — opaque session token, unguessable and URL/header-safe.
export function generateSessionToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
