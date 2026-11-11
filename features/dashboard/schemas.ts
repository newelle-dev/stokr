import { z } from 'zod';

// guid (not uuid) so the all-zero dev seed ids validate, same as the sales schemas
export const dashboardFilterSchema = z.object({ branchId: z.string().guid().optional() });
export type DashboardFilter = z.infer<typeof dashboardFilterSchema>;
