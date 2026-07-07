import type { ClassificationRuleDto } from '@ledger/shared';
import { apiClient } from './client';

export interface RuleInput {
  pattern: string;
  categoryId: string;
  subcategory?: string | null;
  priority?: number;
  active?: boolean;
}

export const rulesApi = {
  list: async (): Promise<ClassificationRuleDto[]> => {
    const { data } = await apiClient.get<ClassificationRuleDto[]>('/classification-rules');
    return data;
  },
  create: async (input: RuleInput): Promise<ClassificationRuleDto> => {
    const { data } = await apiClient.post<ClassificationRuleDto>('/classification-rules', input);
    return data;
  },
  update: async (id: string, input: Partial<RuleInput>): Promise<ClassificationRuleDto> => {
    const { data } = await apiClient.patch<ClassificationRuleDto>(`/classification-rules/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/classification-rules/${id}`);
  },
};
