// Logging a dismissal doesn't change today's recommendation - it just feeds Phase 9's passive
// learning (repeated dismissals of the same protein should eventually surface a prompt to adjust
// that protein's frequency setting).
export async function recordDismissal(
	db: D1Database,
	userId: string,
	proteinType: string,
	now: Date = new Date(),
): Promise<void> {
	await db
		.prepare("INSERT INTO recommendation_dismissals (id, user_id, protein_type, dismissed_at) VALUES (?, ?, ?, ?)")
		.bind(crypto.randomUUID(), userId, proteinType, now.toISOString())
		.run();
}
