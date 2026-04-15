/**
 * Optimistic Update Hook
 * Provides instant UI feedback before server confirms
 */
import { useState, useCallback } from 'react';
import { logger } from '../../core/utils';

export interface OptimisticItem<T> {
  data: T;
  isOptimistic: boolean;
  isPending: boolean;
}

export function useOptimisticUpdate<T extends { id: string }>() {
  const [optimisticItems, setOptimisticItems] = useState<OptimisticItem<T>[]>([]);
  const [serverItems, setServerItems] = useState<T[]>([]);

  // Add item optimistically (instant UI update)
  const addOptimistic = useCallback(
    async (
      optimisticData: T,
      asyncFn: () => Promise<T>,
      onSuccess?: (serverData: T) => void,
      onError?: (error: Error) => void
    ) => {
      // 1. Add to UI immediately (0ms latency)
      setOptimisticItems((prev) => [
        ...prev,
        { data: optimisticData, isOptimistic: true, isPending: true },
      ]);

      try {
        // 2. Call server
        const serverData = await asyncFn();

        // 3. Replace optimistic with server data
        setOptimisticItems((prev) =>
          prev.filter((item) => item.data.id !== optimisticData.id)
        );
        setServerItems((prev) => [...prev, serverData]);

        // 4. Success callback
        onSuccess?.(serverData);

        logger.debug(`Optimistic update succeeded for item ${serverData.id}`);
      } catch (error) {
        // 5. Rollback on error
        setOptimisticItems((prev) =>
          prev.filter((item) => item.data.id !== optimisticData.id)
        );

        // 6. Error callback
        onError?.(error as Error);

        logger.error('Optimistic update failed', error as Error);
      }
    },
    []
  );

  // Update item optimistically
  const updateOptimistic = useCallback(
    async (
      id: string,
      optimisticData: Partial<T>,
      asyncFn: () => Promise<T>,
      onSuccess?: (serverData: T) => void,
      onError?: (error: Error) => void
    ) => {
      // Store original data for rollback
      const originalItem = serverItems.find((item) => item.id === id);
      if (!originalItem) return;

      // 1. Update UI immediately
      setServerItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...optimisticData } : item
        )
      );

      try {
        // 2. Call server
        const serverData = await asyncFn();

        // 3. Replace with server data
        setServerItems((prev) =>
          prev.map((item) => (item.id === id ? serverData : item))
        );

        // 4. Success callback
        onSuccess?.(serverData);
      } catch (error) {
        // 5. Rollback to original
        setServerItems((prev) =>
          prev.map((item) => (item.id === id ? originalItem : item))
        );

        // 6. Error callback
        onError?.(error as Error);

        logger.error('Optimistic update failed', error as Error);
      }
    },
    [serverItems]
  );

  // Remove item optimistically
  const removeOptimistic = useCallback(
    async (
      id: string,
      asyncFn: () => Promise<boolean>,
      onSuccess?: () => void,
      onError?: (error: Error) => void
    ) => {
      // Store original for rollback
      const originalItem = serverItems.find((item) => item.id === id);
      if (!originalItem) return;

      // 1. Remove from UI immediately
      setServerItems((prev) => prev.filter((item) => item.id !== id));

      try {
        // 2. Call server
        const success = await asyncFn();

        if (!success) {
          throw new Error('Delete failed');
        }

        // 3. Success callback
        onSuccess?.();
      } catch (error) {
        // 4. Rollback - add item back
        setServerItems((prev) => [...prev, originalItem]);

        // 5. Error callback
        onError?.(error as Error);

        logger.error('Optimistic delete failed', error as Error);
      }
    },
    [serverItems]
  );

  // Set server items (initial load)
  const setItems = useCallback((items: T[]) => {
    setServerItems(items);
  }, []);

  // Get all items (optimistic + server)
  const allItems = [
    ...optimisticItems.map((item) => item.data),
    ...serverItems,
  ];

  return {
    items: allItems,
    optimisticItems,
    serverItems,
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    setItems,
  };
}
