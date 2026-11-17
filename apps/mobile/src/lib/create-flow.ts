import { useSyncExternalStore } from 'react';

/**
 * Whether "create a trip" is open on the Trips tab (Plan 66). Kept outside React so the tab
 * bar's New trip button (in the tabs layout) and the Trips screen share it.
 */
let open = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((l) => l());
}

export const startCreateFlow = () => set(true);
export const closeCreateFlow = () => set(false);
export const createFlowOpen = () => open;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCreateFlow(): { open: boolean; start: () => void; close: () => void } {
  const isOpen = useSyncExternalStore(subscribe, createFlowOpen, createFlowOpen);
  return { open: isOpen, start: startCreateFlow, close: closeCreateFlow };
}
