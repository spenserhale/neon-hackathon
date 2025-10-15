import { stackServerApp } from "@/lib/stack/server";

export const maxDuration = 30;

export async function POST(req: Request) {
    const user = await stackServerApp.getUser({ or: "redirect" });
    const { query, queries } = await req.json() as { query?: string; queries?: string[] };

    if (!query && !queries) {
        return Response.json({ error: "Query or queries are required" }, { status: 400 });
    }

    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (!perplexityApiKey) {
        return Response.json({ error: "Perplexity API key not configured" }, { status: 500 });
    }

    try {
        // Handle multiple queries
        if (queries && queries.length > 0) {
            const searchPromises = queries.map(async (singleQuery) => {
                const response = await fetch('https://api.perplexity.ai/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${perplexityApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-sonar-small-128k-online',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a helpful assistant that provides accurate, up-to-date information about local businesses and services. Focus on providing factual, location-specific information when available.'
                            },
                            {
                                role: 'user',
                                content: singleQuery
                            }
                        ],
                        max_tokens: 1000,
                        temperature: 0.2,
                        top_p: 0.9,
                        return_citations: true,
                        search_domain_filter: ['perplexity.ai'],
                        search_recency_filter: 'month'
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Perplexity API request failed: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json() as any;

                return {
                    query: singleQuery,
                    answer: data.choices?.[0]?.message?.content || 'No response received',
                    citations: data.citations || [],
                    model: data.model,
                    usage: data.usage,
                    search_metadata: {
                        query: singleQuery,
                        timestamp: new Date().toISOString(),
                    }
                };
            });

            const results = await Promise.all(searchPromises);
            return Response.json({ results });
        }

        // Handle single query (backward compatibility)
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${perplexityApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-small-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that provides accurate, up-to-date information about local businesses and services. Focus on providing factual, location-specific information when available.'
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                max_tokens: 1000,
                temperature: 0.2,
                top_p: 0.9,
                return_citations: true,
                search_domain_filter: ['perplexity.ai'],
                search_recency_filter: 'month'
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Perplexity API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as any;

        return Response.json({
            answer: data.choices?.[0]?.message?.content || 'No response received',
            citations: data.citations || [],
            model: data.model,
            usage: data.usage,
            search_metadata: {
                query: query,
                timestamp: new Date().toISOString(),
            }
        });
    } catch (error) {
        console.error('Perplexity API error:', error);
        return Response.json({
            error: error instanceof Error ? error.message : 'Failed to search'
        }, { status: 500 });
    }
}
