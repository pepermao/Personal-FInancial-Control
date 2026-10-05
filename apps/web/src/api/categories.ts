import type { CategoryDto, CategoryKind } from '@kevin/shared';
import { apiClient } from './client';

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  parentId?: string | null;
}

export const categoriesApi = {
  list: async (): Promise<CategoryDto[]> => {
    const { data } = await apiClient.get<CategoryDto[]>('/categories');
    return data;
  },
  create: async (input: CategoryInput): Promise<CategoryDto> => {
    const { data } = await apiClient.post<CategoryDto>('/categories', {
      ...input,
      parentId: input.parentId ?? undefined,
    });
    return data;
  },
  update: async (id: string, input: Partial<CategoryInput>): Promise<CategoryDto> => {
    const { data } = await apiClient.patch<CategoryDto>(`/categories/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
