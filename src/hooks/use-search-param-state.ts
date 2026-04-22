import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";

/**
 * URL-backed string state. Removes the param entirely when value === defaultValue.
 * This keeps URLs clean and lets back/forward restore filters without flicker.
 */
export function useSearchParamState(key: string, defaultValue: string = ""): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? defaultValue;
  const setValue = useCallback((next: string) => {
    const p = new URLSearchParams(params);
    if (!next || next === defaultValue) p.delete(key);
    else p.set(key, next);
    setParams(p, { replace: true });
  }, [key, defaultValue, params, setParams]);
  return [value, setValue];
}
