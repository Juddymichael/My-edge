import { z } from 'zod';

export const SessionHoursSchema = z.object({
  enabled: z.boolean(),
  startUtc: z.number().min(0).max(23),
  endUtc: z.number().min(0).max(23),
});

export const UserSettingsSchema = z.object({
  id: z.string().min(1),
  timezone: z.string().min(1),
  currency: z.string().min(1),
  defaultRisk: z.number().positive().nullable(),
  defaultRiskType: z.enum(['PERCENT', 'FIXED']),
  sessionSettings: z.object({
    sydney: SessionHoursSchema,
    tokyo: SessionHoursSchema,
    london: SessionHoursSchema,
    newYork: SessionHoursSchema,
  }),
  theme: z.enum(['dark', 'light', 'system']),
  initialAccountBalance: z.number().positive(),
  updatedAt: z.string().datetime(),
});

export type ValidatedUserSettings = z.infer<typeof UserSettingsSchema>;
