import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { logApiError } from "@/api/logger";

/**
 * Builds the application's TanStack Query client with global cache hooks
 * that funnel every query / mutation failure through the structured
 * `logApiError` sink.
 *
 * Exposed as a factory so tests can build an isolated client without
 * importing the production singleton.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: import.meta.env.PROD,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        logApiError(error, { source: "query", key: query.queryKey });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        logApiError(error, {
          source: "mutation",
          key: mutation.options.mutationKey,
        });
      },
    }),
  });
}
