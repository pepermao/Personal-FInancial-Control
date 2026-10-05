import type { ConnectTokenDto, PluggyConnectionDto } from '@kevin/shared';
import { apiClient } from './client';

export interface OpenFinanceStatusDto {
  configured: boolean;
  connectionCount: number;
  /** Legacy env-configured items, honoured only while no connection is registered. */
  itemCount: number;
}

export interface SyncAccountResultDto {
  accountName: string;
  pluggyAccountId: string;
  imported: number;
  duplicated: number;
  needsReview: number;
  pending: number;
  balance: string;
}

export interface SyncResultDto {
  itemIds: string[];
  accounts: SyncAccountResultDto[];
  investmentsUpserted: number;
  totalImported: number;
}

export const openFinanceApi = {
  status: async (): Promise<OpenFinanceStatusDto> =>
    (await apiClient.get<OpenFinanceStatusDto>('/open-finance/status')).data,

  list: async (): Promise<PluggyConnectionDto[]> =>
    (await apiClient.get<PluggyConnectionDto[]>('/open-finance/connections')).data,

  /** Token for connecting a new bank. */
  connectToken: async (): Promise<string> =>
    (await apiClient.post<ConnectTokenDto>('/open-finance/connect-token')).data.accessToken,

  /** Token that reopens the widget in update mode, to renew an expired consent. */
  reconnectToken: async (id: string): Promise<string> =>
    (await apiClient.post<ConnectTokenDto>(`/open-finance/connections/${id}/reconnect-token`)).data
      .accessToken,

  /** Persists the item id the widget returns on success. */
  register: async (itemId: string): Promise<PluggyConnectionDto> =>
    (await apiClient.post<PluggyConnectionDto>('/open-finance/connections', { itemId })).data,

  refresh: async (id: string): Promise<PluggyConnectionDto> =>
    (await apiClient.post<PluggyConnectionDto>(`/open-finance/connections/${id}/refresh`)).data,

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/open-finance/connections/${id}`);
  },

  sync: async (days = 365): Promise<SyncResultDto> =>
    (await apiClient.post<SyncResultDto>('/open-finance/sync', { days })).data,
};
