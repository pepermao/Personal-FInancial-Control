import type { AccountDto, AccountType } from '@ledger/shared';
import { apiClient } from './client';

export interface AccountInput {
  bankId: string;
  name: string;
  type?: AccountType;
  accountNumber?: string | null;
  initialBalance?: string;
  notes?: string | null;
}

export const accountsApi = {
  list: async (): Promise<AccountDto[]> => {
    const { data } = await apiClient.get<AccountDto[]>('/accounts');
    return data;
  },
  create: async (input: AccountInput): Promise<AccountDto> => {
    const { data } = await apiClient.post<AccountDto>('/accounts', input);
    return data;
  },
  update: async (id: string, input: Partial<AccountInput>): Promise<AccountDto> => {
    const { data } = await apiClient.patch<AccountDto>(`/accounts/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/accounts/${id}`);
  },
};
