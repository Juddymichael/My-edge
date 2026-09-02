import { z } from 'zod';

export const SetupSchema = z.object({
  id: z.string().min(1, 'Setup ID is required'),
  name: z.string().min(1, 'Setup name is required'),
  shortName: z.string().min(1, 'Short name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string(),
  rules: z.array(z.string()),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const EntryModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  setupId: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean(),
});

export type ValidatedSetup = z.infer<typeof SetupSchema>;
export type ValidatedEntryModel = z.infer<typeof EntryModelSchema>;
