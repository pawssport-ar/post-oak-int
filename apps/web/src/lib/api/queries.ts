'use client';

import type {
  Account,
  AccountSecrets,
  ApprovalPolicy,
  AssistantAnswer,
  AuditEvent,
  BalancePoint,
  BalanceRange,
  Bill,
  CapitalReadiness,
  Card,
  CardSecrets,
  CashFlowMonth,
  Forecast,
  ForecastQuery,
  Invoice,
  Notification,
  OverviewSummary,
  Payment,
  PaymentQuote,
  CreatePaymentInput,
  ReceivablesSummary,
  Recipient,
  SearchResults,
  Session,
  SpendingBreakdown,
  SpendingPeriod,
  Statement,
  Transaction,
  TransactionPage,
  TreasurySweep,
  User,
} from '@post-oak/contracts';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, toQuery } from './client';

export type TransactionFilters = {
  q?: string | undefined;
  accountId?: string[] | undefined;
  category?: string[] | undefined;
  rail?: string[] | undefined;
  status?: string[] | undefined;
  direction?: 'in' | 'out' | undefined;
  from?: string | undefined;
  to?: string | undefined;
  minAmount?: number | undefined;
  maxAmount?: number | undefined;
  cardId?: string | undefined;
  sort?: 'date' | 'amount' | 'counterparty' | undefined;
  order?: 'asc' | 'desc' | undefined;
};

export const useSession = () =>
  useQuery({ queryKey: ['session'], queryFn: () => api<Session>('/session') });

export const useOverview = (enabled = true) =>
  useQuery({
    queryKey: ['overview'],
    queryFn: () => api<OverviewSummary>('/overview'),
    enabled,
  });

export const useAccounts = (enabled = true) =>
  useQuery({ queryKey: ['accounts'], queryFn: () => api<Account[]>('/accounts'), enabled });

export const useStatements = (accountId: string | null) =>
  useQuery({
    queryKey: ['accounts', accountId, 'statements'],
    queryFn: () => api<Statement[]>(`/accounts/${accountId}/statements`),
    enabled: Boolean(accountId),
  });

export const revealAccount = (accountId: string) =>
  api<AccountSecrets>(`/accounts/${accountId}/reveal`, { method: 'POST' });

export const useBalanceHistory = (range: BalanceRange) =>
  useQuery({
    queryKey: ['insights', 'balance', range],
    queryFn: () => api<BalancePoint[]>(`/insights/balance?range=${range}`),
    placeholderData: keepPreviousData,
  });

export const useCashFlow = () =>
  useQuery({
    queryKey: ['insights', 'cash-flow'],
    queryFn: () => api<CashFlowMonth[]>('/insights/cash-flow'),
  });

export const useSpending = (period: SpendingPeriod) =>
  useQuery({
    queryKey: ['insights', 'spending', period],
    queryFn: () => api<SpendingBreakdown>(`/insights/spending?period=${period}`),
    placeholderData: keepPreviousData,
  });

export const useForecast = (query: Partial<ForecastQuery>) =>
  useQuery({
    queryKey: ['insights', 'forecast', query],
    queryFn: () => api<Forecast>(`/insights/forecast${toQuery(query)}`),
    placeholderData: keepPreviousData,
  });

export const useSweep = (enabled = true) =>
  useQuery({
    queryKey: ['accounts', 'sweep'],
    queryFn: () => api<TreasurySweep | null>('/insights/sweep'),
    enabled,
  });

const PAGE_SIZE = 40;

export const useTransactions = (filters: TransactionFilters) =>
  useInfiniteQuery({
    queryKey: ['transactions', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<TransactionPage>(
        `/transactions${toQuery({ ...filters, page: pageParam, pageSize: PAGE_SIZE })}`,
      ),
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });

export const useRecentTransactions = (limit: number) =>
  useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: () => api<TransactionPage>(`/transactions?pageSize=${limit}`),
  });

export const useTransaction = (id: string | null) =>
  useQuery({
    queryKey: ['transactions', 'detail', id],
    queryFn: () => api<Transaction>(`/transactions/${id}`),
    enabled: Boolean(id),
  });

export const usePayments = (enabled = true) =>
  useQuery({ queryKey: ['payments'], queryFn: () => api<Payment[]>('/payments'), enabled });

export const useRecipients = (enabled = true) =>
  useQuery({
    queryKey: ['recipients'],
    queryFn: () => api<Recipient[]>('/recipients'),
    enabled,
  });

export const usePaymentQuote = (input: CreatePaymentInput | null) =>
  useQuery({
    queryKey: ['payments', 'quote', input],
    queryFn: () => api<PaymentQuote>('/payments/quote', { method: 'POST', body: input }),
    enabled: input !== null,
    staleTime: 0,
  });

export const useCards = () =>
  useQuery({ queryKey: ['cards'], queryFn: () => api<Card[]>('/cards') });

export const revealCard = (cardId: string) =>
  api<CardSecrets>(`/cards/${cardId}/reveal`, { method: 'POST' });

export const useBills = () =>
  useQuery({ queryKey: ['bills'], queryFn: () => api<Bill[]>('/bills') });

export const useInvoices = () =>
  useQuery({ queryKey: ['invoices'], queryFn: () => api<Invoice[]>('/invoices') });

export const useReceivables = () =>
  useQuery({
    queryKey: ['invoices', 'summary'],
    queryFn: () => api<ReceivablesSummary>('/invoices/summary'),
  });

export const useTeam = () => useQuery({ queryKey: ['team'], queryFn: () => api<User[]>('/team') });

export const usePolicies = () =>
  useQuery({ queryKey: ['team', 'policies'], queryFn: () => api<ApprovalPolicy[]>('/policies') });

export const useAuditLog = (enabled: boolean) =>
  useQuery({
    queryKey: ['team', 'audit'],
    queryFn: () => api<AuditEvent[]>('/audit-log'),
    enabled,
  });

export const useCapital = () =>
  useQuery({
    queryKey: ['capital'],
    queryFn: () => api<CapitalReadiness>('/capital/readiness'),
  });

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Notification[]>('/notifications'),
  });

export const useGlobalSearch = (q: string) =>
  useQuery({
    queryKey: ['search', q],
    queryFn: () => api<SearchResults>(`/search${toQuery({ q })}`),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

export const askAssistant = (question: string) =>
  api<AssistantAnswer>('/assistant/ask', { method: 'POST', body: { question } });

/** Refreshes every query, used after switching persona or resetting the sandbox. */
export function useRefreshAll() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}
