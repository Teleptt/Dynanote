import React from 'react';
/**
 * React.lazy caches a failed import forever, so a chunk that failed once (network blip, or a rebuild
 * replacing hashed files) would keep the panel broken. Retry a few times before giving up.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(load: () => Promise<{ default: T }>, attempts = 3) {
  return React.lazy(async () => {
    for (let i = 1; ; i++) {
      try { return await load(); } catch (error) {
        if (i >= attempts) throw error;
        await new Promise(r => setTimeout(r, 400 * i));
      }
    }
  });
}
