import type { AssetDto, AssetType, ProfitRateType } from '@ledger/shared';
import { apiClient } from './client';

export interface AssetInput {
  name: string;
  type: AssetType;
  value: string;
  profitRateType?: ProfitRateType;
  profitRate?: string | null;
  date?: string;
  notes?: string | null;
}

export const assetsApi = {
  list: async (): Promise<AssetDto[]> => {
    const { data } = await apiClient.get<AssetDto[]>('/assets');
    return data;
  },
  create: async (input: AssetInput): Promise<AssetDto> => {
    const { data } = await apiClient.post<AssetDto>('/assets', input);
    return data;
  },
  update: async (id: string, input: Partial<AssetInput>): Promise<AssetDto> => {
    const { data } = await apiClient.patch<AssetDto>(`/assets/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/${id}`);
  },
};
