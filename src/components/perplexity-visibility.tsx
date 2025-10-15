'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Copy, Brain } from 'lucide-react';

type PerplexityCitation = {
    text: string;
    url: string;
    title?: string;
};

type PerplexityResponse = {
    answer: string;
    citations: PerplexityCitation[];
    model: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    search_metadata: {
        query: string;
        timestamp: string;
    };
    error?: string;
};

type PerplexityMultiResponse = {
    results: PerplexityResponse[];
};

export default function PerplexityVisibility() {
    const [searchTerm, setSearchTerm] = useState('Doctor Niamtu');
    const [generatedQueries, setGeneratedQueries] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [results, setResults] = useState<{
        [key: string]: PerplexityResponse | { error: string };
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
            const response = await fetch('/api/perplexity-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const errorData = await response.json() as { error?: string };
                throw new Error(errorData.error || 'Failed to search');
            }

            const data = await response.json() as PerplexityResponse;
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
            const response = await fetch('/api/perplexity-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queries: generatedQueries }),
            });

            if (!response.ok) {
                const errorData = await response.json() as { error?: string };
                throw new Error(errorData.error || 'Failed to search');
            }

            const data = await response.json() as PerplexityMultiResponse;
            const newResults: { [key: string]: PerplexityResponse | { error: string } } = {};

            data.results.forEach((result, index) => {
                newResults[`query_${index}`] = result;
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

    const renderPerplexityResponse = (response: PerplexityResponse | { error: string }, type: string) => {
        if ('error' in response) {
            return (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-red-600 text-sm">{response.error}</p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Perplexity AI - {type}
                    </CardTitle>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{response.model}</Badge>
                        {response.usage && (
                            <Badge variant="outline">
                                {response.usage.total_tokens} tokens
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="prose prose-sm max-w-none">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {response.answer}
                        </p>
                    </div>

                    {response.citations.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-3">Sources</h4>
                            <div className="space-y-2">
                                {response.citations.map((citation, index) => (
                                    <div key={index} className="border rounded-lg p-3 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <a
                                                href={citation.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                                            >
                                                {citation.title || citation.url}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(citation.text)}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{citation.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Perplexity Visibility</h1>
                <p className="text-muted-foreground">
                    Test how your practice appears in Perplexity AI search results with AI-generated search queries.
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
                                    ) : (
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Query {index + 1}: {query}</h3>
                                            {renderPerplexityResponse(result, `Query ${index + 1}`)}
                                        </div>
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
