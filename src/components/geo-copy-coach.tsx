'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Copy, Download, ExternalLink } from 'lucide-react';

type Audit = {
    id: string;
    url: string;
    score_who: number;
    score_what: number;
    score_where: number;
    entity_score: number;
    summary?: string;
    issues?: string[];
    recommendations?: {
        id: string;
        kind: string;
        priority: number;
        sentence: string;
    }[];
    entities?: {
        id: string;
        etype: string;
        value: string;
    }[];
};

export default function GeoCopyCoach() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [audit, setAudit] = useState<Audit | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function runAudit() {
        if (!url) return;

        setLoading(true);
        setAudit(null);
        setError(null);

        try {
            const res = await fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: url }),
            });

            if (!res.ok) {
                const errorData = await res.json() as { error?: string };
                throw new Error(errorData.error || 'Failed to run audit');
            }

            const data = await res.json() as Audit;
            setAudit(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
        if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">GEO/AEO Copy Coach</h1>
                <p className="text-muted-foreground">
                    Analyze your homepage for local SEO optimization and get actionable copy recommendations.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Run Website Audit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && runAudit()}
                            className="flex-1"
                        />
                        <Button
                            onClick={runAudit}
                            disabled={!url || loading}
                            className="min-w-[120px]"
                        >
                            {loading ? 'Auditing...' : 'Audit'}
                        </Button>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {audit && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    Audit Results
                                    <ExternalLink className="h-4 w-4" />
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(audit.url, '_blank')}
                                >
                                    View Site
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground break-all">{audit.url}</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge className={`${getScoreColor(audit.score_who)} border`}>
                                    Who: {audit.score_who}
                                </Badge>
                                <Badge className={`${getScoreColor(audit.score_what)} border`}>
                                    What: {audit.score_what}
                                </Badge>
                                <Badge className={`${getScoreColor(audit.score_where)} border`}>
                                    Where: {audit.score_where}
                                </Badge>
                                <Badge className={`${getScoreColor(audit.entity_score)} border`}>
                                    Entity: {audit.entity_score}
                                </Badge>
                            </div>

                            {audit.summary && (
                                <div>
                                    <h3 className="font-semibold mb-2">Summary</h3>
                                    <p className="text-sm text-muted-foreground">{audit.summary}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {audit.issues && audit.issues.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Issues Found</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {audit.issues.map((issue, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-red-500 mt-1">•</span>
                                            <span className="text-sm">{issue}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {audit.recommendations && audit.recommendations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Recommended Copy</CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(`/api/export/${audit.id}`, '_blank')}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {audit.recommendations.map((rec) => (
                                        <div key={rec.id} className="border rounded-lg p-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-xs">
                                                    {rec.kind} • Priority {rec.priority}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(rec.sentence)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-sm leading-relaxed">{rec.sentence}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {audit.entities && audit.entities.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Extracted Entities</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {audit.entities.map((entity) => (
                                        <div key={entity.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                                            <Badge variant="secondary" className="text-xs">
                                                {entity.etype}
                                            </Badge>
                                            <span className="text-sm">{entity.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
