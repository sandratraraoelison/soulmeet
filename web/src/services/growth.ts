import { api } from './api';
import type { GrowthOverview } from '@/types';

export const growthService = {
  overview: () => api<GrowthOverview>('/growth'),
};
