import { stackServerApp } from "@/lib/stack/server";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const QuerySchema = z.object({
    queries: z.array(z.string()).length(5).describe("Array of exactly 5 search queries"),
});

export async function POST(req: Request) {
    const user = await stackServerApp.getUser({ or: "redirect" });
    const { searchTerm } = await req.json() as { searchTerm: string };

    if (!searchTerm) {
        return Response.json({ error: "Search term is required" }, { status: 400 });
    }

    try {
        const result = await generateObject({
            model: openai("gpt-4o"),
            schema: QuerySchema,
            prompt: `Generate exactly 5 Google search queries that people would use to find information about "${searchTerm}". 

The queries should cover different aspects of the practice/doctor:
1. Who is [searchTerm] - basic identification
2. What does [searchTerm] do - services offered
3. What area does [searchTerm] serve - location/service area
4. What hours is [searchTerm] open - business hours
5. One additional relevant query (reviews, contact info, specialties, etc.)

Make the queries natural and conversational, as people would actually type them into Google. Use the exact search term provided: "${searchTerm}".

Examples of good queries:
- "Who is Dr. Smith"
- "What does Dr. Smith do"
- "What area does Dr. Smith serve"
- "What hours is Dr. Smith open"
- "Dr. Smith reviews" or "Dr. Smith contact information"

Return exactly 5 queries in the specified format.`,
        });

        return Response.json({ queries: result.object.queries });
    } catch (error) {
        console.error('Query generation error:', error);
        return Response.json({
            error: error instanceof Error ? error.message : 'Failed to generate queries'
        }, { status: 500 });
    }
}
