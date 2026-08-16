import { useQuery } from '@tanstack/react-query';
import { soulApi } from '../api/soul.api';
export const useSoulMatches = () => useQuery({ queryKey: ['soul', 'matches'], queryFn: soulApi.matches });
