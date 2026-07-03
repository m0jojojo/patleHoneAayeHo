import type { VisionResult } from "./provider";

// gemini-2.5-flash - 1.5-flash has been retired (404s), and some Google accounts see a 0-quota
// free tier for 2.0-flash specifically; 2.5-flash is confirmed to have real free-tier quota.
const GEMINI_ENDPOINT =
	"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Must match `dishes.name` rows exactly (backend/migrations/0009_create_dishes.up.sql) - an
// unmatched label still comes back as `matched: false` rather than erroring, but giving Gemini the
// closed list up front means most real plates actually resolve to a nutrition lookup.
const KNOWN_DISH_NAMES = [
	"Dal (tadka)",
	"Roti (whole wheat, plain)",
	"White rice (cooked)",
	"Paneer curry",
	"Chicken curry",
	"Mixed vegetable sabzi",
	"Curd (dahi, plain)",
	"Boiled egg",
	"Banana",
];

const PROMPT = `You are looking at a photo of an Indian home-cooked meal. Identify each distinct dish on the plate.

For each dish you recognize from this list, use its exact name: ${KNOWN_DISH_NAMES.join(", ")}.
If a dish isn't on the list, describe it briefly in your own words instead of guessing a list item.

Respond with ONLY a JSON object, no markdown fences, matching this shape:
{"dishes": [{"label": string, "confidence": number between 0 and 1, "portionMultiplier": number}]}

"portionMultiplier" is relative to a standard home portion (1 = standard, 2 = double, 0.5 = half),
estimated from how much is visible on the plate. "confidence" reflects how sure you are of the
dish identification itself, not the portion size.`;

interface GeminiResponse {
	candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export async function scanWithGemini(apiKey: string, imageBase64: string): Promise<VisionResult> {
	const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			contents: [
				{
					parts: [{ text: PROMPT }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }],
				},
			],
			generationConfig: { responseMimeType: "application/json" },
		}),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(`Gemini vision request failed: ${response.status} ${body}`);
	}

	const data = (await response.json()) as GeminiResponse;
	const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) {
		throw new Error("Gemini response had no text content");
	}

	const parsed = JSON.parse(text) as VisionResult;
	if (!Array.isArray(parsed.dishes)) {
		throw new Error("Gemini response did not contain a dishes array");
	}

	return parsed;
}
