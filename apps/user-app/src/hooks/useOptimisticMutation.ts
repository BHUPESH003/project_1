import { useState } from 'react';

export function useOptimisticMutation<TArgs, TResult, TState>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  onOptimisticUpdate: (args: TArgs) => TState, // returns previous state for rollback
  onRollback: (previousState: TState) => void,
  onSuccess?: (result: TResult) => void
) {
  const [isMutating, setIsMutating] = useState(false);

  const mutate = async (args: TArgs) => {
    setIsMutating(true);
    // 1. Optimistic Update (instant UI)
    const previousState = onOptimisticUpdate(args);
    
    try {
      // 2. Perform API call
      const result = await mutationFn(args);
      // 3. Sync
      if (onSuccess) onSuccess(result);
    } catch (error) {
      // 4. Rollback on failure
      onRollback(previousState);
    } finally {
      setIsMutating(false);
    }
  };

  return { mutate, isMutating };
}
