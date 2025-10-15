import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/lib/db/db";
import { audits } from "@/lib/db/schema";
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
            entities: true,
        },
    });

    if (!audit) {
        return Response.json({ error: "Audit not found" }, { status: 404 });
    }

    return Response.json(audit);
}
