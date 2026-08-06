import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

// Returns the client value after hydration, or the server value during SSR.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  const getServerSnapshot = () => server as S | C;
  return useSyncExternalStore(emptySubscribe, () => client as S | C, getServerSnapshot);
}
