"use client";

import { useEffect, useState, useCallback } from "react";
import { syncEngine, SyncEngineState } from "./sync-engine";
import { getAllSyncQueue, SyncQueueItem } from "./db";

export function useOfflineSync() {
  const [state, setState] = useState<SyncEngineState>(syncEngine.getState());
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);

  useEffect(() => {
    let mounted = true;

    getAllSyncQueue().then((items) => {
      if (mounted) setQueue(items);
    });

    const unsubscribe = syncEngine.subscribe((nextState) => {
      if (!mounted) return;
      setState(nextState);
      getAllSyncQueue().then((items) => {
        if (mounted) setQueue(items);
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(() => {
    return syncEngine.sync();
  }, []);

  const retryFailed = useCallback(() => {
    return syncEngine.retryFailed();
  }, []);

  return {
    ...state,
    queue,
    triggerSync,
    retryFailed,
  };
}
