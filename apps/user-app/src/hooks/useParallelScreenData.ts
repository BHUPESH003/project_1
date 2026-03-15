import { useState, useEffect } from 'react';

export interface UseParallelDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useParallelScreenData<T extends Record<string, () => Promise<any>>>(
  calls: T
) {
  // Infer the return types of the promises
  type ResultType = { [K in keyof T]: Awaited<ReturnType<T[K]>> };
  
  const [data, setData] = useState<Partial<ResultType>>({});
  const [loading, setLoading] = useState<{ [K in keyof T]?: boolean }>(
    Object.keys(calls).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
  const [errors, setErrors] = useState<{ [K in keyof T]?: Error | null }>({});

  useEffect(() => {
    const entries = Object.entries(calls);
    
    // Execute all concurrently but update state individually for graceful degradation
    entries.forEach(async ([key, fetcher]) => {
      try {
        setLoading(prev => ({ ...prev, [key]: true }));
        // Add 3-second timeout for delivery partners per requirements using Promise.race
        const isDeliveryCall = key.toLowerCase().includes('delivery');
        
        let fetchPromise = fetcher();
        if (isDeliveryCall) {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout fallback')), 3000)
            );
            fetchPromise = Promise.race([fetchPromise, timeoutPromise]) as Promise<any>;
        }

        const result = await fetchPromise;
        setData(prev => ({ ...prev, [key]: result }));
      } catch (err) {
        setErrors(prev => ({ ...prev, [key]: err instanceof Error ? err : new Error(String(err)) }));
      } finally {
        setLoading(prev => ({ ...prev, [key]: false }));
      }
    });
  }, []);

  return { data, loading, errors };
}
