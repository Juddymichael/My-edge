import { z } from 'zod';

export const ImportFileTypeSchema = z.enum(['CSV', 'XLSX', 'XLS', 'PDF', 'JSON', 'MANUAL']);
export const ImportStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_FAILED']);

export const ImportLogSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  fileType: ImportFileTypeSchema,
  importedAt: z.string().datetime(),
  totalRows: z.number().int().nonnegative(),
  validTrades: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  needsReview: z.number().int().nonnegative(),
  status: ImportStatusSchema,
  errorMessage: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ValidatedImportLog = z.infer<typeof ImportLogSchema>;
