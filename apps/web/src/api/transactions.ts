import type { CategoryKind, Direction, ReclassifyResultDto, TransactionDto, TransactionNature, TransactionType } from '@kevin/shared';
import { apiClient } from './client';

export interface TransactionWithRelations extends TransactionDto {
  account?: { id: string; name: string; bank?: { name: string } };
  category?: { id: string; name: string; kind: CategoryKind } | null;
}

export interface TransactionCreateInput {
  accountId: string;
  date: string;
  competenceMonth: string;
  descriptionRaw: string;
  amount: string;
  direction: Direction;
  type?: TransactionType;
  nature?: TransactionNature;
  categoryId?: string | null;
  subcategory?: string;
  notes?: string;
}

export type TransactionUpdateInput = Partial<TransactionCreateInput>;

export const transactionsApi = {
  list: async (): Promise<TransactionWithRelations[]> => {
    const { data } = await apiClient.get<TransactionWithRelations[]>('/transactions');
    return data;
  },
  create: async (input: TransactionCreateInput): Promise<TransactionDto> => {
    const { data } = await apiClient.post<TransactionDto>('/transactions', input);
    return data;
  },
  update: async (id: string, input: TransactionUpdateInput): Promise<TransactionDto> => {
    const { data } = await apiClient.patch<TransactionDto>(`/transactions/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
  },
  reclassifyAll: async (): Promise<ReclassifyResultDto> => {
    const { data } = await apiClient.post<ReclassifyResultDto>('/transactions/reclassify');
    return data;
  },
};
