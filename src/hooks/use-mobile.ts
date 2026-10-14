import { useShell } from '@/providers/shell.provider';

export function useIsMobile() {
  return useShell() === 'mobile';
}
