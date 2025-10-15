import { stackServerApp } from "@/lib/stack/server";
import { db } from "@/lib/db/db";
import { audits, recommendations, entities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const AIShapeSchema = z.object({
    who: z.object({
        clinic_name: z.string().optional(),
        people: z.array(z.string()).default([]),
        contacts: z.object({
            phone: z.string().optional(),
            email: z.string().optional(),
            address: z.string().optional(),
        }).default({}),
    }),
    what: z.object({
        services: z.array(z.string()).default([]),
        treatments: z.array(z.string()).default([]),
    }),
    where: z.object({
        cities: z.array(z.string()).default([]),
        service_area: z.array(z.string()).default([]),
    }),
    scores: z.object({
        who: z.number().min(0).max(100),
        what: z.number().min(0).max(100),
        where: z.number().min(0).max(100),
        entity: z.number().min(0).max(100),
    }),
    issues: z.array(z.string()).default([]),
    sentences: z.array(z.object({
        text: z.string(),
        kind: z.enum(['who', 'what', 'where', 'general']),
        priority: z.number().min(1).max(5),
        rationale: z.string().optional(),
    })).default([]),
    extracted_entities: z.array(z.object({
        etype: z.string(),
        value: z.string(),
    })).default([]),
    summary: z.string().optional(),
});

type AIShape = z.infer<typeof AIShapeSchema>;

function sanitize(html: string) {
    const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    return noScripts.slice(0, 120000);
}

export async function POST(req: Request) {
    const user = await stackServerApp.getUser({ or: "redirect" });
    const { target } = await req.json() as { target: string };

    if (!target) {
        return Response.json({ error: "URL is required" }, { status: 400 });
    }

    try {
        const res = await fetch(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GEO-AEO-Copy-Coach/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        if (!res.ok) {
            return Response.json({ error: "Failed to fetch URL" }, { status: 400 });
        }

        const html = await res.text();
        const cleaned = sanitize(html);

        const system = `You are a GEO/AEO homepage copy coach. You analyze HTML for local business clarity. You output strict JSON only. You avoid fabrication. You prefer "unknown" and bracket placeholders for missing data.

Score who/what/where and overall entity coverage 0-100. List issues that block AI answers. Generate 7–10 literal, quotable sentences users can paste into a homepage. Each sentence must be unambiguous, present tense, and aligned to dental practice context when applicable.

Generate 7-10 literal, quotable sentences. Keep them present tense and specific. If key data missing, include a placeholder in square brackets. Do not include markdown. Examples:
"We are accepting new patients; call [phone]."
"We offer dental implants for adults."
"Our office is in [City], serving [Nearby City A] and [Nearby City B]."`;

        const result = await generateObject({
            model: openai("gpt-4o"),
            schema: AIShapeSchema,
            prompt: `${system}\n\nHTML:\n${cleaned}`,
        });

        const obj = result.object;

        const [audit] = await db.insert(audits).values({
            url: target,
            score_who: obj.scores.who,
            score_what: obj.scores.what,
            score_where: obj.scores.where,
            entity_score: obj.scores.entity,
            summary: obj.summary || '',
            issues: obj.issues,
        }).returning();

        const auditId = audit.id;

        if (obj.sentences.length > 0) {
            await db.insert(recommendations).values(
                obj.sentences.map(s => ({
                    audit_id: auditId,
                    kind: s.kind,
                    priority: s.priority,
                    sentence: s.text,
                }))
            );
        }

        if (obj.extracted_entities.length > 0) {
            await db.insert(entities).values(
                obj.extracted_entities.map(e => ({
                    audit_id: auditId,
                    etype: e.etype,
                    value: e.value,
                }))
            );
        }

        const auditWithRelations = await db.query.audits.findFirst({
            where: eq(audits.id, auditId),
            with: {
                recommendations: {
                    orderBy: (recommendations, { asc }) => [asc(recommendations.priority)],
                },
                entities: true,
            },
        });

        return Response.json(auditWithRelations);
    } catch (error) {
        console.error('Audit error:', error);
        return Response.json({ error: "Failed to process audit" }, { status: 500 });
    }
}
