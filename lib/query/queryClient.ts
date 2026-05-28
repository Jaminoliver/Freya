import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:            3 * 60 * 1000,
        gcTime:               10 * 60 * 1000,
        retry:                1,
        refetchOnWindowFocus: true,
      },
    },
  });
}