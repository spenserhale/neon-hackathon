import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/lib/db/db";
import { audits } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
    const user = await stackServerApp.getUser({ or: "redirect" });

    const auditList = await db
        .select({
            id: audits.id,
            url: audits.url,
            score_who: audits.score_who,
            score_what: audits.score_what,
            score_where: audits.score_where,
            entity_score: audits.entity_score,
            created_at: audits.created_at,
        })
        .from(audits)
        .orderBy(desc(audits.created_at))
        .limit(50);

    return Response.json(auditList);
}
