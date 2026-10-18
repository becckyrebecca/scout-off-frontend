'use client';
import { useState, useCallback } from 'react';
import { useVisibilityInterval } from '@/hooks/useVisibilityInterval';

interface ContractStatusData {
  isHealthy: boolean;
  isPaused: boolean;
}

const POLL_INTERVAL_MS = 60_000;

// lib/contract.ts (and the @stellar/stellar-sdk it pulls in) is dynamically
// imported here rather than statically — this hook runs from Navbar, which
// is mounted on every page via the root layout, so a static import would
// put the whole SDK on every page's critical path just for a background
// health-check poll.
async function fetchContractStatus(): Promise<ContractStatusData> {
  const { getContractHealth, getContractPaused } =
    await import('@/lib/contract');
  const [isHealthy, isPaused] = await Promise.all([
    (async () => {
      try {
        await getContractHealth();
        return true;
      } catch {
        return false;
      }
    })(),
    (async () => {
      try {
        const v = await getContractPaused();
        return v === true;
      } catch {
        return false;
      }
    })(),
  ]);
  return { isHealthy, isPaused };
}

export function useContractStatus() {
  const [data, setData] = useState<ContractStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const poll = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchContractStatus();
    setData(result);
    setIsLoading(false);
  }, []);

  useVisibilityInterval(poll, POLL_INTERVAL_MS, { runOnVisible: true });

  return {
    isPaused: data?.isPaused ?? false,
    isHealthy: data?.isHealthy ?? true,
    isLoading,
  };
}
