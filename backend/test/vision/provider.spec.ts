import { afterEach, describe, expect, it, vi } from "vitest";
import { createVisionProvider } from "../../src/vision/provider";

const originalFetch = global.fetch;

describe("createVisionProvider", () => {
	afterEach(() => {
		global.fetch = originalFetch;
	});

	it("returns undefined (falls back to the stub) when no Gemini API key is configured", () => {
		expect(createVisionProvider(undefined)).toBeUndefined();
		expect(createVisionProvider("")).toBeUndefined();
	});

	it("calls Gemini when an API key is configured", async () => {
		const geminiReply = {
			candidates: [{ content: { parts: [{ text: JSON.stringify({ dishes: [] }) }] } }],
		};
		const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(geminiReply), { status: 200 }));
		global.fetch = mockFetch;

		const provider = createVisionProvider("real-key");
		expect(provider).toBeDefined();

		await provider!("base64imagedata");
		expect(mockFetch).toHaveBeenCalled();
	});
});
