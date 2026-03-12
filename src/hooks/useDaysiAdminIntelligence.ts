import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  listDaysiIntelligenceKeywordOpportunities,
  listDaysiIntelligenceCompetitors,
  listDaysiIntelligenceCompetitorAlerts,
  listDaysiIntelligenceTrends,
  listDaysiIntelligenceContentSuggestions,
  fetchDaysiIntelligenceLatestBrief,
  triggerDaysiIntelligenceKeywordScan,
  triggerDaysiIntelligenceSocialScan,
  generateDaysiIntelligenceContentSuggestions,
  generateDaysiIntelligenceMarketBrief,
  acknowledgeDaysiIntelligenceCompetitorAlert,
  acceptDaysiIntelligenceContentSuggestion,
  dismissDaysiIntelligenceContentSuggestion,
  triggerDaysiIntelligenceCompetitorScan,
} from "@/lib/daysi-admin-api";

export const useDaysiIntelligenceKeywordOpportunities = (limit = 20) => {
  const { token } = useAdminAuth();
  return useQuery({
    queryKey: ["intelligence", "keywords", "opportunities", limit],
    queryFn: () => listDaysiIntelligenceKeywordOpportunities({ token: token!, limit }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDaysiIntelligenceCompetitors = () => {
  const { token } = useAdminAuth();
  return useQuery({
    queryKey: ["intelligence", "competitors"],
    queryFn: () => listDaysiIntelligenceCompetitors({ token: token! }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDaysiIntelligenceCompetitorAlerts = () => {
  const { token } = useAdminAuth();
  return useQuery({
    queryKey: ["intelligence", "competitor-alerts"],
    queryFn: () => listDaysiIntelligenceCompetitorAlerts({ token: token! }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
};

export const useDaysiIntelligenceTrends = (minVelocity = 0) => {
  const { token } = useAdminAuth();
  return useQuery({
    queryKey: ["intelligence", "trends", minVelocity],
    queryFn: () => listDaysiIntelligenceTrends({ token: token!, minVelocity }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDaysiIntelligenceContentSuggestions = () => {
  const { token } = useAdminAuth();
  return useQuery({
    queryKey: ["intelligence", "content-suggestions"],
    queryFn: () => listDaysiIntelligenceContentSuggestions({ token: token! }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
};

export const useDaysiIntelligenceLatestBrief = () => {
  const { token } = useAdminAuth();
  return useQuery({
    queryKey: ["intelligence", "brief", "latest"],
    queryFn: () => fetchDaysiIntelligenceLatestBrief({ token: token! }),
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });
};

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useTriggerDaysiKeywordScan = () => {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars?: { services?: string[] }) =>
      triggerDaysiIntelligenceKeywordScan({ token: token!, ...vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "keywords"] });
    },
  });
};

export const useTriggerDaysiSocialScan = () => {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => triggerDaysiIntelligenceSocialScan({ token: token! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "trends"] });
    },
  });
};

export const useTriggerDaysiCompetitorScan = () => {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (competitors: Array<{ name: string; websiteUrl: string; location: string }>) =>
      triggerDaysiIntelligenceCompetitorScan({ token: token!, competitors }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "competitors"] });
    },
  });
};

export const useGenerateDaysiContentSuggestions = () => {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => generateDaysiIntelligenceContentSuggestions({ token: token! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "content-suggestions"] });
    },
  });
};

export const useGenerateDaysiMarketBrief = () => {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => generateDaysiIntelligenceMarketBrief({ token: token! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "brief"] });
    },
  });
};

export const useAcknowledgeDaysiCompetitorAlert = () => {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) =>
      acknowledgeDaysiIntelligenceCompetitorAlert({ token: token!, alertId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "competitor-alerts"] });
    },
  });
};

export const useAcceptDaysiContentSuggestion = () => {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) =>
      acceptDaysiIntelligenceContentSuggestion({ token: token!, suggestionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "content-suggestions"] });
    },
  });
};

export const useDismissDaysiContentSuggestion = () => {
  const { token } = useAdminAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) =>
      dismissDaysiIntelligenceContentSuggestion({ token: token!, suggestionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "content-suggestions"] });
    },
  });
};
