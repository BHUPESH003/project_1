import { useRef, useEffect, useState } from 'react';

export function useFilterDiff<T extends Record<string, any>>(
  currentFilters: T,
  onDiffChange: (diff: Partial<T>) => void
) {
  const previousFilters = useRef<T>(currentFilters);
  
  useEffect(() => {
    const diff: Partial<T> = {};
    let hasChanges = false;
    
    for (const key in currentFilters) {
      if (currentFilters[key] !== previousFilters.current[key]) {
        diff[key] = currentFilters[key];
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      onDiffChange(diff);
      previousFilters.current = currentFilters;
    }
  }, [currentFilters, onDiffChange]);

  return previousFilters.current;
}
