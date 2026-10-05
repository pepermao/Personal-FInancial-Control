import type { BulkImportResultDto } from '@kevin/shared';
import { apiClient } from './client';

export interface BulkImportInput {
  accountId: string;
  files: File[];
  /** Only honored when exactly one file is uploaded. */
  initialBalance?: string;
  /** Only honored when exactly one file is uploaded. */
  endBalance?: string;
}

export const importsApi = {
  bulk: async (input: BulkImportInput): Promise<BulkImportResultDto> => {
    const form = new FormData();
    form.append('accountId', input.accountId);
    input.files.forEach((f) => form.append('files', f));
    if (input.files.length === 1) {
      if (input.initialBalance) form.append('initialBalance', input.initialBalance);
      if (input.endBalance) form.append('endBalance', input.endBalance);
    }
    const { data } = await apiClient.post<BulkImportResultDto>('/imports/csv/bulk', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
