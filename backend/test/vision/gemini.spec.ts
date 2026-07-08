import { afterEach, describe, expect, it, vi } from "vitest";
import { scanWithGemini } from "../../src/vision/gemini";

const originalFetch = global.fetch;

describe("scanWithGemini", () => {
	afterEach(() => {
		global.fetch = originalFetch;
	});

	it("posts the image and prompt to Gemini's generateContent endpoint and parses the JSON reply", async () => {
		const geminiReply = {
			candidates: [
				{
					content: {
						parts: [
							{
								text: JSON.stringify({
									dishes: [{ label: "Chicken curry", confidence: 0.88, portionMultiplier: 1.5 }],
								}),
							},
						],
					},
				},
			],
		};
		const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(geminiReply), { status: 200 }));
		global.fetch = mockFetch;

		const result = await scanWithGemini("test-api-key", "base64imagedata");

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining("key=test-api-key"),
			expect.objectContaining({ method: "POST" }),
		);
		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.contents[0].parts[1]).toEqual({ inline_data: { mime_type: "image/jpeg", data: "base64imagedata" } });
		expect(result).toEqual({ dishes: [{ label: "Chicken curry", confidence: 0.88, portionMultiplier: 1.5 }] });
	});

	it("parses estimatedMacros through into the result untouched", async () => {
		const geminiReply = {
			candidates: [
				{
					content: {
						parts: [
							{
								text: JSON.stringify({
									dishes: [
										{
											label: "Malabar parotta",
											confidence: 0.8,
											portionMultiplier: 1,
											estimatedMacros: { calories: 300, proteinG: 6, carbsG: 40, fatG: 12 },
										},
									],
								}),
							},
						],
					},
				},
			],
		};
		global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(geminiReply), { status: 200 }));

		const result = await scanWithGemini("test-api-key", "base64imagedata");

		expect(result.dishes[0].estimatedMacros).toEqual({ calories: 300, proteinG: 6, carbsG: 40, fatG: 12 });
	});

	it("throws when Gemini responds with a non-2xx status", async () => {
		global.fetch = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));

		await expect(scanWithGemini("test-api-key", "base64imagedata")).rejects.toThrow(/Gemini vision request failed/);
	});

	it("throws when Gemini's response has no text content", async () => {
		global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [] }), { status: 200 }));

		await expect(scanWithGemini("test-api-key", "base64imagedata")).rejects.toThrow(/no text content/);
	});

	it("throws when Gemini's text isn't the expected { dishes } shape", async () => {
		const geminiReply = {
			candidates: [{ content: { parts: [{ text: JSON.stringify({ notDishes: [] }) }] } }],
		};
		global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(geminiReply), { status: 200 }));

		await expect(scanWithGemini("test-api-key", "base64imagedata")).rejects.toThrow(/dishes array/);
	});
});
