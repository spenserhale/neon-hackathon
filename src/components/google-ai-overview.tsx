'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Copy } from 'lucide-react';

type AIOverviewBlock = {
    type: 'paragraph' | 'heading' | 'list';
    snippet?: string;
    snippet_highlighted_words?: string[];
    list?: Array<{
        title: string;
        snippet: string;
        reference_indexes?: number[];
    }>;
};

type AIOverviewReference = {
    title: string;
    link: string;
    snippet: string;
    source: string;
    index: number;
};

type AIOverview = {
    text_blocks?: AIOverviewBlock[];
    thumbnail?: string;
    references?: AIOverviewReference[];
    error?: string;
};

type AnswerBoxHoursItem = {
    day: string;
    hours: string;
};

type AnswerBoxHoursList = {
    title: string;
    items: AnswerBoxHoursItem[];
};

type AnswerBox = {
    result: string;
    description: string;
    hours_list?: AnswerBoxHoursList[];
    type: string;
};

type SerpApiResponse = {
    ai_overview?: AIOverview;
    answer_box?: AnswerBox;
    search_metadata?: {
        total_results?: string;
        time_taken?: string;
        query?: string;
    };
    error?: string;
};

export default function GoogleAIOverview() {
    const [searchTerm, setSearchTerm] = useState('Doctor Niamtu');
    const [generatedQueries, setGeneratedQueries] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [results, setResults] = useState<{
        [key: string]: SerpApiResponse;
    }>({});
    const [error, setError] = useState<string | null>(null);

    const generateQueries = async () => {
        if (!searchTerm.trim()) return;

        setGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/generate-queries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchTerm }),
            });

            if (!response.ok) {
                const errorData = await response.json() as { error?: string };
                throw new Error(errorData.error || 'Failed to generate queries');
            }

            const data = await response.json() as { queries: string[] };
            setGeneratedQueries(data.queries);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setGenerating(false);
        }
    };

    const searchQuery = async (query: string, queryIndex: number) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/serp-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const errorData = await response.json() as { error?: string };
                throw new Error(errorData.error || 'Failed to search');
            }

            const data = await response.json() as SerpApiResponse;
            setResults(prev => ({ ...prev, [`query_${queryIndex}`]: data }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const searchAll = async () => {
        if (generatedQueries.length === 0) return;

        setLoading(true);
        setError(null);
        setResults({});

        try {
            const searchPromises = generatedQueries.map((query, index) =>
                fetch('/api/serp-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                }).then(async (response) => {
                    const data = response.ok
                        ? await response.json() as SerpApiResponse
                        : { error: `Failed to search query ${index + 1}` };
                    return { index, data };
                })
            );

            const searchResults = await Promise.all(searchPromises);
            const newResults: { [key: string]: SerpApiResponse } = {};

            searchResults.forEach(({ index, data }) => {
                newResults[`query_${index}`] = data;
            });

            setResults(newResults);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const renderAIOverviewBlock = (block: AIOverviewBlock, index: number) => {
        if (!block || !block.type) {
            return null;
        }

        switch (block.type) {
            case 'paragraph':
                return (
                    <p key={index} className="text-sm leading-relaxed mb-3">
                        {block.snippet || 'No content available'}
                    </p>
                );

            case 'heading':
                return (
                    <h3 key={index} className="font-semibold text-base mb-2 mt-4">
                        {block.snippet || 'No heading available'}
                    </h3>
                );

            case 'list':
                return (
                    <ul key={index} className="space-y-2 mb-3">
                        {block.list && block.list.length > 0 ? (
                            block.list.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start gap-2">
                                    <span className="text-blue-600 font-medium text-sm min-w-0 flex-shrink-0">
                                        {item.title || 'Item'}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {item.snippet || 'No description available'}
                                    </span>
                                </li>
                            ))
                        ) : (
                            <li className="text-sm text-muted-foreground">No list items available</li>
                        )}
                    </ul>
                );

            default:
                return (
                    <div key={index} className="text-sm text-muted-foreground mb-3">
                        Unknown block type: {block.type}
                    </div>
                );
        }
    };

    const renderAnswerBox = (answerBox: AnswerBox, type: string, metadata?: SerpApiResponse['search_metadata']) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Google Answer Box - {type}
                </CardTitle>
                {metadata && (
                    <div className="flex gap-2 text-xs text-muted-foreground">
                        {metadata.total_results && (
                            <Badge variant="outline">~{metadata.total_results} results</Badge>
                        )}
                        {metadata.time_taken && (
                            <Badge variant="outline">{metadata.time_taken}</Badge>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">{answerBox.description}</h3>
                        <p className="text-lg font-bold text-blue-800">{answerBox.result}</p>
                    </div>

                    {answerBox.hours_list && answerBox.hours_list.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-3">Business Hours</h4>
                            {answerBox.hours_list.map((hoursList, listIndex) => (
                                <div key={listIndex} className="space-y-2">
                                    <h5 className="font-medium text-sm text-muted-foreground">{hoursList.title}</h5>
                                    <div className="grid grid-cols-2 gap-2">
                                        {hoursList.items.map((item, itemIndex) => (
                                            <div key={itemIndex} className="flex justify-between items-center p-2 border rounded">
                                                <span className="text-sm font-medium">{item.day}</span>
                                                <span className="text-sm text-muted-foreground">{item.hours}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {answerBox.type && answerBox.type !== 'hours' && (
                        <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
                            <p className="text-xs text-muted-foreground">
                                Answer Box Type: <span className="font-medium">{answerBox.type}</span>
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const renderAIOverview = (overview: AIOverview, type: string, metadata?: SerpApiResponse['search_metadata']) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Google AI Overview - {type}
                </CardTitle>
                {metadata && (
                    <div className="flex gap-2 text-xs text-muted-foreground">
                        {metadata.total_results && (
                            <Badge variant="outline">~{metadata.total_results} results</Badge>
                        )}
                        {metadata.time_taken && (
                            <Badge variant="outline">{metadata.time_taken}</Badge>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {overview.thumbnail && (
                    <div className="flex justify-center">
                        <img
                            src={overview.thumbnail}
                            alt="AI Overview thumbnail"
                            className="max-w-full h-auto rounded-lg"
                        />
                    </div>
                )}

                <div className="space-y-3">
                    {overview.error ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                                <p className="text-red-800 text-sm font-medium">AI Overview Error</p>
                            </div>
                            <p className="text-red-700 text-sm">{overview.error}</p>
                        </div>
                    ) : overview.text_blocks && overview.text_blocks.length > 0 ? (
                        overview.text_blocks.map((block, index) =>
                            renderAIOverviewBlock(block, index)
                        )
                    ) : (
                        <p className="text-muted-foreground text-sm">No content available in AI Overview</p>
                    )}
                </div>

                {overview.references && overview.references.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-3">References</h4>
                        <div className="space-y-2">
                            {overview.references.map((ref, index) => (
                                <div key={index} className="border rounded-lg p-3 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <a
                                            href={ref.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                                        >
                                            {ref.title}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(ref.snippet)}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{ref.snippet}</p>
                                    <Badge variant="outline" className="text-xs">
                                        {ref.source}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Google AI Overview</h1>
                <p className="text-muted-foreground">
                    Test how your practice appears in Google's AI Overview results with AI-generated search queries.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Search Term</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Practice/Doctor Name</label>
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Enter your practice or doctor name"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={generateQueries}
                            disabled={generating || !searchTerm.trim()}
                            className="flex-1"
                        >
                            {generating ? 'Generating Queries...' : 'Generate AI Queries'}
                        </Button>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {generatedQueries.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Search Queries</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            {generatedQueries.map((query, index) => (
                                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                                    <span className="text-sm font-medium text-muted-foreground min-w-0 flex-shrink-0">
                                        {index + 1}.
                                    </span>
                                    <span className="text-sm flex-1">{query}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => searchQuery(query, index)}
                                        disabled={loading}
                                    >
                                        Search
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={searchAll}
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? 'Searching All...' : 'Search All Queries'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {Object.keys(results).length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">Search Results</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {generatedQueries.map((query, index) => {
                            const result = results[`query_${index}`];
                            if (!result) return null;

                            return (
                                <div key={index}>
                                    {result.error ? (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-sm">Query {index + 1}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-red-600 text-sm">{result.error}</p>
                                            </CardContent>
                                        </Card>
                                    ) : result.ai_overview ? (
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Query {index + 1}: {query}</h3>
                                            {renderAIOverview(result.ai_overview, `Query ${index + 1}`, result.search_metadata)}
                                        </div>
                                    ) : result.answer_box ? (
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Query {index + 1}: {query}</h3>
                                            {renderAnswerBox(result.answer_box, `Query ${index + 1}`, result.search_metadata)}
                                        </div>
                                    ) : (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-sm">Query {index + 1}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-muted-foreground text-sm">No AI Overview or Answer Box found for this query</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {Object.keys(results).length === 0 && !loading && generatedQueries.length === 0 && (
                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">
                            Enter your practice or doctor name above and click "Generate AI Queries" to get started.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
