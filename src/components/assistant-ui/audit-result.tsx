'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';

type AuditResultProps = {
    audit: {
        url: string;
        scores: {
            who: number;
            what: number;
            where: number;
            entity: number;
        };
        summary?: string;
        issues?: string[];
        recommendations: {
            kind: string;
            priority: number;
            sentence: string;
        }[];
        entities: {
            type: string;
            value: string;
        }[];
    };
};

export function AuditResult({ audit }: AuditResultProps) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
        if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Website Audit Results</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(audit.url, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Site
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground break-all">{audit.url}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Badge className={`${getScoreColor(audit.scores.who)} border`}>
                            Who: {audit.scores.who}
                        </Badge>
                        <Badge className={`${getScoreColor(audit.scores.what)} border`}>
                            What: {audit.scores.what}
                        </Badge>
                        <Badge className={`${getScoreColor(audit.scores.where)} border`}>
                            Where: {audit.scores.where}
                        </Badge>
                        <Badge className={`${getScoreColor(audit.scores.entity)} border`}>
                            Entity: {audit.scores.entity}
                        </Badge>
                    </div>

                    {audit.summary && (
                        <div>
                            <h4 className="font-semibold mb-2">Summary</h4>
                            <p className="text-sm text-muted-foreground">{audit.summary}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {audit.issues && audit.issues.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Issues Found</CardTitle>
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

            {audit.recommendations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recommended Copy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {audit.recommendations.map((rec, i) => (
                                <div key={i} className="border rounded-lg p-3 space-y-2">
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

            {audit.entities.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Extracted Entities</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {audit.entities.map((entity, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                                    <Badge variant="secondary" className="text-xs">
                                        {entity.type}
                                    </Badge>
                                    <span className="text-sm">{entity.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
