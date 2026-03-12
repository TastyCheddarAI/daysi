import { useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Users,
  Zap,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Globe,
  BarChart2,
  Sparkles,
  Brain,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDaysiIntelligenceKeywordOpportunities,
  useDaysiIntelligenceCompetitors,
  useDaysiIntelligenceCompetitorAlerts,
  useDaysiIntelligenceTrends,
  useDaysiIntelligenceContentSuggestions,
  useDaysiIntelligenceLatestBrief,
  useTriggerDaysiKeywordScan,
  useTriggerDaysiSocialScan,
  useGenerateDaysiContentSuggestions,
  useGenerateDaysiMarketBrief,
  useAcknowledgeDaysiCompetitorAlert,
  useAcceptDaysiContentSuggestion,
  useDismissDaysiContentSuggestion,
  useTriggerDaysiCompetitorScan,
} from "@/hooks/useDaysiAdminIntelligence";
import type {
  DaysiCompetitorAlert,
  DaysiContentSuggestion,
  DaysiKeywordSnapshot,
  DaysiSocialTrend,
} from "@/lib/daysi-admin-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const competitionColor = (c: string) => {
  if (c === "HIGH") return "destructive";
  if (c === "MEDIUM") return "secondary";
  return "outline";
};

const priorityColor = (p: string) => {
  if (p === "URGENT") return "destructive";
  if (p === "HIGH") return "secondary";
  return "outline";
};

const significanceColor = (s: string) => {
  if (s === "HIGH") return "destructive";
  if (s === "MEDIUM") return "secondary";
  return "outline";
};

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === "RISING") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (direction === "DECLINING") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const formatVolume = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

// ── Competitor scan dialog state ───────────────────────────────────────────────

const DEFAULT_WINNIPEG_COMPETITORS = [
  { name: "", websiteUrl: "", location: "Winnipeg, MB" },
];

// ── Sections ──────────────────────────────────────────────────────────────────

function KeywordsSection() {
  const { data: snapshots = [], isLoading, refetch, isRefetching } = useDaysiIntelligenceKeywordOpportunities(30);
  const scan = useTriggerDaysiKeywordScan();
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleScan = async () => {
    toast.promise(scan.mutateAsync(), {
      loading: "Running keyword scan via DataForSEO… (this may take 30–60s)",
      success: (r) => `Scan complete — ${r.snapshotsCreated} snapshots saved`,
      error: (e) => `Scan failed: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Keyword Opportunities
          </CardTitle>
          <CardDescription>Top keywords by search volume — Winnipeg &amp; Manitoba</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleScan} disabled={scan.isPending}>
            <Zap className="h-4 w-4 mr-2" />
            {scan.isPending ? "Scanning…" : "Run Scan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading keyword data…</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No keyword data yet. Run a scan to populate opportunities.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Volume/mo</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Competition</TableHead>
                <TableHead className="text-right">CPC</TableHead>
                <TableHead>Scanned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snap: DaysiKeywordSnapshot) => (
                <>
                  <TableRow
                    key={snap.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpanded(expanded === snap.id ? null : snap.id)}
                  >
                    <TableCell className="font-medium flex items-center gap-1">
                      {expanded === snap.id
                        ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      {snap.keyword}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{snap.service}</TableCell>
                    <TableCell className="text-right font-mono">{formatVolume(snap.monthlySearchVolume)}</TableCell>
                    <TableCell><TrendIcon direction={snap.trendDirection} /></TableCell>
                    <TableCell>
                      <Badge variant={competitionColor(snap.competition) as "destructive" | "secondary" | "outline"}>
                        {snap.competition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${snap.cpc.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(snap.scannedAt)}</TableCell>
                  </TableRow>
                  {expanded === snap.id && snap.serp.length > 0 && (
                    <TableRow key={`${snap.id}-serp`}>
                      <TableCell colSpan={7} className="bg-muted/30 px-6 pb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Top SERP Results</p>
                        <ol className="space-y-1">
                          {snap.serp.slice(0, 5).map((r) => (
                            <li key={r.rank} className="text-sm flex gap-2">
                              <span className="text-muted-foreground w-4 shrink-0">{r.rank}.</span>
                              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                                {r.title || r.url}
                              </a>
                            </li>
                          ))}
                        </ol>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TrendsSection() {
  const { data: trends = [], isLoading, refetch, isRefetching } = useDaysiIntelligenceTrends();
  const scan = useTriggerDaysiSocialScan();

  const handleScan = async () => {
    toast.promise(scan.mutateAsync(), {
      loading: "Scanning social trends via xAI/Grok…",
      success: (r) => `Detected ${r.trendsDetected} trends`,
      error: (e) => `Scan failed: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
  };

  const platformIcon = (p: string) => {
    const icons: Record<string, string> = {
      TWITTER: "𝕏",
      REDDIT: "r/",
      TIKTOK: "♪",
      INSTAGRAM: "◈",
    };
    return icons[p] ?? p;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Social Trends
          </CardTitle>
          <CardDescription>Rising topics on social platforms — powered by xAI/Grok</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleScan} disabled={scan.isPending}>
            <Zap className="h-4 w-4 mr-2" />
            {scan.isPending ? "Scanning…" : "Run Scan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading trend data…</p>
        ) : trends.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No trend data yet. Run a scan to detect rising topics.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trends.map((t: DaysiSocialTrend) => (
              <div key={t.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-muted-foreground">{platformIcon(t.platform)}</span>
                  <Badge variant="outline">{t.platform}</Badge>
                </div>
                <p className="font-semibold text-sm">{t.topic}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>{t.velocity.toFixed(0)} posts/hr</span>
                  <span>·</span>
                  <span className={t.sentimentScore >= 0 ? "text-green-600" : "text-red-600"}>
                    {t.sentimentScore >= 0 ? "+" : ""}{(t.sentimentScore * 100).toFixed(0)}% sentiment
                  </span>
                </div>
                {t.relatedServices.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.relatedServices.slice(0, 3).map((s) => (
                      <span key={s} className="text-xs bg-muted rounded px-1.5 py-0.5 capitalize">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompetitorsSection() {
  const { data: competitors = [], isLoading } = useDaysiIntelligenceCompetitors();
  const { data: alerts = [], refetch: refetchAlerts } = useDaysiIntelligenceCompetitorAlerts();
  const acknowledge = useAcknowledgeDaysiCompetitorAlert();
  const competitorScan = useTriggerDaysiCompetitorScan();

  const [showScanForm, setShowScanForm] = useState(false);
  const [competitorInputs, setCompetitorInputs] = useState(DEFAULT_WINNIPEG_COMPETITORS);

  const handleAcknowledge = (alertId: string) => {
    acknowledge.mutate(alertId, {
      onSuccess: () => {
        toast.success("Alert acknowledged");
        refetchAlerts();
      },
    });
  };

  const handleScan = async () => {
    const valid = competitorInputs.filter((c) => c.name && c.websiteUrl);
    if (valid.length === 0) {
      toast.error("Add at least one competitor with name and URL");
      return;
    }
    toast.promise(competitorScan.mutateAsync(valid), {
      loading: "Scanning competitors via Perplexity…",
      success: (r) => `Scanned ${r.recordsCreated} competitors`,
      error: (e) => `Scan failed: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
    setShowScanForm(false);
  };

  const unackedAlerts = alerts.filter((a: DaysiCompetitorAlert) => !a.acknowledged);

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {unackedAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Competitor Alerts ({unackedAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unackedAlerts.map((alert: DaysiCompetitorAlert) => (
              <div key={alert.id} className="flex items-start justify-between gap-4 bg-background rounded-lg p-3 border">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={significanceColor(alert.significance) as "destructive" | "secondary" | "outline"}>
                      {alert.significance}
                    </Badge>
                    <span className="text-sm font-medium">{alert.competitorName}</span>
                    <span className="text-xs text-muted-foreground">— {alert.changeType.replace("_", " ")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="line-through">{alert.previousValue}</span>
                    {" → "}
                    <span className="font-medium text-foreground">{alert.newValue}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtDate(alert.detectedAt)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAcknowledge(alert.id)}
                  disabled={acknowledge.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Ack
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Competitor records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Competitor Clinics
            </CardTitle>
            <CardDescription>Monitored competitors — powered by Perplexity AI</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowScanForm(!showScanForm)}>
            <Zap className="h-4 w-4 mr-2" />
            Scan Competitors
          </Button>
        </CardHeader>
        {showScanForm && (
          <div className="px-6 pb-4 space-y-3 border-b">
            <p className="text-sm text-muted-foreground">Enter competitor clinics to scan:</p>
            {competitorInputs.map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input
                  className="col-span-1 border rounded px-3 py-1.5 text-sm"
                  placeholder="Clinic name"
                  value={c.name}
                  onChange={(e) => {
                    const updated = [...competitorInputs];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setCompetitorInputs(updated);
                  }}
                />
                <input
                  className="col-span-1 border rounded px-3 py-1.5 text-sm"
                  placeholder="https://theirwebsite.com"
                  value={c.websiteUrl}
                  onChange={(e) => {
                    const updated = [...competitorInputs];
                    updated[i] = { ...updated[i], websiteUrl: e.target.value };
                    setCompetitorInputs(updated);
                  }}
                />
                <input
                  className="col-span-1 border rounded px-3 py-1.5 text-sm"
                  placeholder="City, Province"
                  value={c.location}
                  onChange={(e) => {
                    const updated = [...competitorInputs];
                    updated[i] = { ...updated[i], location: e.target.value };
                    setCompetitorInputs(updated);
                  }}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompetitorInputs([...competitorInputs, { name: "", websiteUrl: "", location: "Winnipeg, MB" }])}
              >
                + Add another
              </Button>
              <Button size="sm" onClick={handleScan} disabled={competitorScan.isPending}>
                {competitorScan.isPending ? "Scanning…" : "Run Scan"}
              </Button>
            </div>
          </div>
        )}
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading competitor data…</p>
          ) : competitors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No competitors scanned yet. Click "Scan Competitors" to add clinics to monitor.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Reviews</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Last Scanned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {c.competitorName}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.location}</TableCell>
                    <TableCell className="text-right font-mono">{c.rating.toFixed(1)} ★</TableCell>
                    <TableCell className="text-right font-mono">{c.reviewCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.services.slice(0, 4).map((s) => (
                          <span key={s} className="text-xs bg-muted rounded px-1.5 py-0.5 capitalize">{s}</span>
                        ))}
                        {c.services.length > 4 && (
                          <span className="text-xs text-muted-foreground">+{c.services.length - 4}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(c.scannedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ContentSuggestionsSection() {
  const { data: suggestions = [], isLoading, refetch } = useDaysiIntelligenceContentSuggestions();
  const generate = useGenerateDaysiContentSuggestions();
  const accept = useAcceptDaysiContentSuggestion();
  const dismiss = useDismissDaysiContentSuggestion();
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleGenerate = () => {
    toast.promise(generate.mutateAsync(), {
      loading: "Generating content suggestions from keyword & trend data…",
      success: (r) => `${r.suggestionsCreated} new suggestions created`,
      error: (e) => `Failed: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
  };

  const handleAccept = (id: string) => {
    accept.mutate(id, {
      onSuccess: () => {
        toast.success("Suggestion accepted — grounding data sent to education module flow");
        refetch();
      },
    });
  };

  const handleDismiss = (id: string) => {
    dismiss.mutate(id, {
      onSuccess: () => {
        toast.success("Suggestion dismissed");
        refetch();
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Content Suggestions
          </CardTitle>
          <CardDescription>SEO-grounded education module ideas derived from keyword &amp; trend data</CardDescription>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generate.isPending}>
          <Sparkles className="h-4 w-4 mr-2" />
          {generate.isPending ? "Generating…" : "Generate Suggestions"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading suggestions…</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No pending suggestions. Run a keyword scan first, then generate suggestions.
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s: DaysiContentSuggestion) => (
              <div key={s.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={priorityColor(s.priority) as "destructive" | "secondary" | "outline"}>
                        {s.priority}
                      </Badge>
                      {s.estimatedSearchVolume > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <BarChart2 className="h-3 w-3" />
                          {formatVolume(s.estimatedSearchVolume)}/mo
                        </span>
                      )}
                    </div>
                    <button
                      className="text-left font-semibold text-sm hover:text-primary flex items-center gap-1"
                      onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    >
                      {expanded === s.id
                        ? <ChevronDown className="h-3 w-3" />
                        : <ChevronRight className="h-3 w-3" />}
                      {s.title}
                    </button>
                    {expanded === s.id && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outline</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          {s.outline.map((item, i) => (
                            <li key={i} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ol>
                        {s.sourceSignals.keywords && s.sourceSignals.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {s.sourceSignals.keywords.map((k) => (
                              <span key={k} className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5">
                                {k}
                              </span>
                            ))}
                          </div>
                        )}
                        {s.sourceSignals.trendTopic && (
                          <span className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded px-1.5 py-0.5">
                            Trending: {s.sourceSignals.trendTopic}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAccept(s.id)}
                      disabled={accept.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(s.id)}
                      disabled={dismiss.isPending}
                    >
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MarketBriefSection() {
  const { data: brief, isLoading } = useDaysiIntelligenceLatestBrief();
  const generate = useGenerateDaysiMarketBrief();

  const handleGenerate = () => {
    toast.promise(generate.mutateAsync(), {
      loading: "Generating market brief with OpenAI — synthesizing all signals…",
      success: "Market brief generated",
      error: (e) => `Failed: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Market Brief
          </CardTitle>
          <CardDescription>Weekly executive synthesis — powered by OpenAI</CardDescription>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generate.isPending}>
          <Sparkles className="h-4 w-4 mr-2" />
          {generate.isPending ? "Generating…" : "Generate Brief"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading latest brief…</p>
        ) : !brief ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No market brief yet. Run keyword and trend scans first, then generate a brief.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Week of {fmtDate(brief.weekOf)}</span>
              <span>·</span>
              <span>Generated {fmtDate(brief.generatedAt)}</span>
              <span>·</span>
              <span>{brief.contentSuggestionsGenerated} suggestions</span>
              <span>·</span>
              <span>{brief.churnRisksIdentified} churn risks</span>
            </div>

            <div className="bg-muted/40 rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Executive Summary</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{brief.executiveSummary}</p>
            </div>

            {brief.topKeywordOpportunities.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Top Keyword Opportunities</p>
                <div className="space-y-1">
                  {brief.topKeywordOpportunities.slice(0, 5).map((k) => (
                    <div key={k.id} className="flex items-center gap-3 text-sm">
                      <TrendIcon direction={k.trendDirection} />
                      <span className="font-medium">{k.keyword}</span>
                      <span className="text-muted-foreground">{formatVolume(k.monthlySearchVolume)}/mo</span>
                      <Badge variant={competitionColor(k.competition) as "destructive" | "secondary" | "outline"} className="text-xs">
                        {k.competition}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {brief.trendingTopics.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Trending Topics</p>
                <div className="flex flex-wrap gap-2">
                  {brief.trendingTopics.slice(0, 6).map((t) => (
                    <span key={t.id} className="text-xs bg-muted rounded-full px-3 py-1">
                      {t.topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "keywords" | "trends" | "competitors" | "suggestions" | "brief";

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: "keywords", label: "Keywords", icon: Search },
  { id: "trends", label: "Social Trends", icon: TrendingUp },
  { id: "competitors", label: "Competitors", icon: Users },
  { id: "suggestions", label: "Content Ideas", icon: FileText },
  { id: "brief", label: "Market Brief", icon: Brain },
];

export default function AdminIntelligence() {
  const [activeTab, setActiveTab] = useState<Tab>("keywords");
  const { data: alerts = [] } = useDaysiIntelligenceCompetitorAlerts();
  const unackedCount = alerts.filter((a: DaysiCompetitorAlert) => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market Intelligence</h1>
        <p className="text-muted-foreground mt-1">
          Real-time keyword demand, competitor monitoring, social trends, and AI-generated content strategy for Winnipeg &amp; Manitoba.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === "competitors" && unackedCount > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 leading-none">
                {unackedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "keywords" && <KeywordsSection />}
      {activeTab === "trends" && <TrendsSection />}
      {activeTab === "competitors" && <CompetitorsSection />}
      {activeTab === "suggestions" && <ContentSuggestionsSection />}
      {activeTab === "brief" && <MarketBriefSection />}
    </div>
  );
}
