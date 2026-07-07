import type { BankDto } from '@ledger/shared';
import { apiClient } from './client';

export const banksApi = {
  list: async (): Promise<BankDto[]> => {
    const { data } = await apiClient.get<BankDto[]>('/banks');
    return data;
  },
};
