import { stackServerApp } from "@/lib/stack/server";

export const maxDuration = 30;

export async function POST(req: Request) {
    const user = await stackServerApp.getUser({ or: "redirect" });
    const { query } = await req.json() as { query: string };

    if (!query) {
        return Response.json({ error: "Query is required" }, { status: 400 });
    }

    const serpApiKey = process.env.SERPAPI_API_KEY;
    if (!serpApiKey) {
        return Response.json({ error: "SerpAPI key not configured" }, { status: 500 });
    }

    try {
        const searchParams = new URLSearchParams({
            q: query,
            api_key: serpApiKey,
            engine: 'google',
            gl: 'us', // Country: United States
            hl: 'en', // Language: English
        });

        const response = await fetch(`https://serpapi.com/search?${searchParams}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;

        // Log the response structure for debugging
        console.log('SerpAPI Response Structure:', {
            hasAiOverview: !!data.ai_overview,
            hasAnswerBox: !!data.answer_box,
            aiOverviewKeys: data.ai_overview ? Object.keys(data.ai_overview) : [],
            answerBoxKeys: data.answer_box ? Object.keys(data.answer_box) : [],
            textBlocksCount: data.ai_overview?.text_blocks?.length || 0,
            referencesCount: data.ai_overview?.references?.length || 0,
            answerBoxType: data.answer_box?.type,
            hasPageToken: !!data.ai_overview?.page_token,
            pageToken: data.ai_overview?.page_token
        });

        // Extract AI Overview and Answer Box if they exist
        let aiOverview = data.ai_overview || null;
        const answerBox = data.answer_box || null;

        // If AI Overview has a page_token, fetch the full content BEFORE returning response
        if (aiOverview && aiOverview.page_token) {
            console.log('AI Overview has page token, fetching full content...');

            try {
                // Use the provided serpapi_link if available, otherwise construct the URL
                const pageTokenUrl = aiOverview.serpapi_link + '&api_key=' + serpApiKey;

                const overviewResponse = await fetch(pageTokenUrl, {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/json',
                  },
                });

                if (overviewResponse.ok) {
                    const overviewData = await overviewResponse.json() as any;

                    if (overviewData.ai_overview) {
                        // Replace the page token version with the full content
                        aiOverview = {
                            ...overviewData.ai_overview,
                            // Remove page_token and serpapi_link since we have the full content
                        };
                        console.log('AI Overview content fetched and merged successfully');
                    } else if (overviewData.error) {
                        console.error('Error in AI Overview page token response:', overviewData.error);

                        aiOverview = { ...aiOverview, error: overviewData.error };
                    } else {
                        console.log('No ai_overview in page token response, removing page token');
                        // Remove the page token so UI doesn't show loading state
                        aiOverview = null;
                    }
                } else {
                    console.error('Failed to fetch AI Overview with page token:', overviewResponse.status);
                    // Remove the page token so UI doesn't show loading state
                    aiOverview = null;
                }
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    console.error('AI Overview page token fetch timed out after 15 seconds');
                } else {
                    console.error('Error fetching AI Overview with page token:', error);
                }
                // Remove the page token so UI doesn't show loading state
                aiOverview = null;
            }
        }

        return Response.json({
            ai_overview: aiOverview,
            answer_box: answerBox,
            search_metadata: {
                total_results: data.search_information?.total_results,
                time_taken: data.search_information?.time_taken_displayed,
                query: data.search_parameters?.q,
            }
        });
    } catch (error) {
        console.error('SerpAPI error:', error);
        return Response.json({
            error: error instanceof Error ? error.message : 'Failed to search'
        }, { status: 500 });
    }
}
