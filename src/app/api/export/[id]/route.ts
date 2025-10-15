import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/lib/db/db";
import { audits, recommendations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await stackServerApp.getUser({ or: "redirect" });
    const { id } = await params;

    const audit = await db.query.audits.findFirst({
        where: eq(audits.id, id),
        with: {
            recommendations: {
                orderBy: (recommendations, { asc }) => [asc(recommendations.priority)],
            },
        },
    });

    if (!audit) {
        return Response.json({ error: "Audit not found" }, { status: 404 });
    }

    const lines = [
        `# GEO/AEO Copy Coach`,
        `URL: ${audit.url}`,
        `Scores — Who: ${audit.score_who} | What: ${audit.score_what} | Where: ${audit.score_where} | Entity: ${audit.entity_score}`,
        ``,
        `## Recommended Literal Sentences`,
        ...audit.recommendations.map((r) => `- [${r.kind} • P${r.priority}] ${r.sentence}`),
        ``,
        `## Issues`,
        ...(audit.issues as string[] || []).map((issue: string) => `- ${issue}`),
    ];

    return new Response(lines.join('\n'), {
        headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="audit-${id}.md"`,
        },
    });
}
