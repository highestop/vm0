import { NextResponse } from "next/server";
import { initServices } from "../../../../src/lib/init-services";
import { agentRuns } from "../../../../src/db/schema/agent-run";
import { usageDaily } from "../../../../src/db/schema/usage-daily";
import { sql, and, gte, lt, isNotNull } from "drizzle-orm";

export async function GET(request: Request): Promise<Response> {
  initServices();

  // Verify cron secret (Vercel automatically injects CRON_SECRET into Authorization header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { message: "Invalid cron secret", code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  // Calculate yesterday's date range in UTC
  const now = new Date();
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const targetDate = yesterday.toISOString().split("T")[0]!;

  // Aggregate completed runs from yesterday, grouped by user
  const results = await globalThis.services.db
    .select({
      userId: agentRuns.userId,
      runCount: sql<number>`COUNT(*)::int`.as("run_count"),
      runTimeMs:
        sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${agentRuns.completedAt} - ${agentRuns.startedAt})) * 1000), 0)::bigint`.as(
          "run_time_ms",
        ),
    })
    .from(agentRuns)
    .where(
      and(
        gte(agentRuns.createdAt, yesterday),
        lt(agentRuns.createdAt, today),
        isNotNull(agentRuns.completedAt),
      ),
    )
    .groupBy(agentRuns.userId);

  // Upsert each user's daily usage
  for (const row of results) {
    await globalThis.services.db
      .insert(usageDaily)
      .values({
        userId: row.userId,
        date: targetDate,
        runCount: row.runCount,
        runTimeMs: Number(row.runTimeMs),
      })
      .onConflictDoUpdate({
        target: [usageDaily.userId, usageDaily.date],
        set: {
          runCount: row.runCount,
          runTimeMs: Number(row.runTimeMs),
          updatedAt: new Date(),
        },
      });
  }

  return NextResponse.json({
    date: targetDate,
    aggregated: results.length,
  });
}
