import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const getServerSnapshot = () => false;

export function useCommandModifier() {
  const isApplePlatform = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return isApplePlatform ? '⌘' : 'Ctrl';
}
