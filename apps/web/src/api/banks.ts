import type { BankDto } from '@kevin/shared';
import { apiClient } from './client';

export const banksApi = {
  list: async (): Promise<BankDto[]> => {
    const { data } = await apiClient.get<BankDto[]>('/banks');
    return data;
  },
};
