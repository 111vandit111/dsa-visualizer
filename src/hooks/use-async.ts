import { useEffect, useState } from "react";

interface AsyncResult<T> {
  deps: readonly unknown[];
  reloadCount: number;
  data: T | undefined;
  error: Error | null;
}

export interface UseAsyncState<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  reload: () => void;
}

function areDepsEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): UseAsyncState<T> {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<AsyncResult<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const settle = (data: T | undefined, error: Error | null) => {
      if (!controller.signal.aborted) {
        setResult({ deps, reloadCount, data, error });
      }
    };
    fn(controller.signal).then(
      (data) => settle(data, null),
      (reason: unknown) => settle(undefined, toError(reason)),
    );
    return () => controller.abort();
    // fn is intentionally excluded: callers pass an inline closure and list the values it reads in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCount]);

  const isSettled =
    result !== null &&
    result.reloadCount === reloadCount &&
    areDepsEqual(result.deps, deps);

  return {
    data: result?.data,
    error: isSettled ? result.error : null,
    isLoading: !isSettled,
    reload: () => setReloadCount((count) => count + 1),
  };
}
