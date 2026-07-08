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

const PROMPT = `You are looking at a photo of Indian food. Identify every visually distinct food item -
don't group different items together into one vague label.

Be as specific as you can (e.g. "Malabar parotta" rather than "paratha"). If several identical
items are visible (e.g. 4 eggs, 3 rotis), that's a count, not a separate line per item.

For an item that is genuinely one of these exact dishes, use its exact name so it matches our
nutrition database: ${KNOWN_DISH_NAMES.join(", ")}. Don't force a loose match - only use one of
these names if it's really that dish. Anything else, describe briefly in your own words.

Respond with ONLY a JSON object, no markdown fences, matching this shape:
{
  "dishes": [
    {
      "label": string,
      "confidence": number between 0 and 1,
      "portionMultiplier": number,
      "estimatedMacros": { "calories": number, "proteinG": number, "carbsG": number, "fatG": number }
    }
  ]
}

"portionMultiplier": only meaningful when "label" is one of the exact known names above - how many
standard portions are visible (e.g. 4 eggs where a standard portion is 1 egg -> portionMultiplier
4). Use 1 if "label" isn't one of the known names.

"estimatedMacros": your own best-effort nutrition estimate for the ENTIRE visible quantity of that
item (not per single portion) - always provide this, even for a known dish name, since it's used as
a fallback if the name doesn't end up matching our database.

"confidence" reflects how sure you are of the identification itself, not the portion/count.`;

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
