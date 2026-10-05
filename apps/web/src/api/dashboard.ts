import type { CashFlowDto, DashboardSummaryDto, NetWorthHistoryDto } from '@kevin/shared';
import { apiClient } from './client';

export interface DashboardPeriodParams {
  year?: string;
  month?: string;
}

export const dashboardApi = {
  summary: async (params: DashboardPeriodParams): Promise<DashboardSummaryDto> => {
    const { data } = await apiClient.get<DashboardSummaryDto>('/dashboard/summary', { params });
    return data;
  },
  cashFlow: async (params: DashboardPeriodParams): Promise<CashFlowDto> => {
    const { data } = await apiClient.get<CashFlowDto>('/dashboard/cash-flow', { params });
    return data;
  },
  netWorthHistory: async (): Promise<NetWorthHistoryDto> => {
    const { data } = await apiClient.get<NetWorthHistoryDto>('/dashboard/net-worth-history');
    return data;
  },
};
