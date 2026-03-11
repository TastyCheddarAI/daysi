import { QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage, isNetworkError, isAuthError } from "./error-handling";

/**
 * Global error handler for React Query queries
 */
export function handleQueryError(error: unknown): void {
  const message = getErrorMessage(error);

  // Handle network errors
  if (isNetworkError(error)) {
    toast.error("Connection error. Please check your internet and try again.");
    return;
  }

  // Handle auth errors - don't show toast, let auth context handle redirect
  if (isAuthError(error)) {
    console.warn("Authentication error in query:", message);
    return;
  }

  // Log unexpected errors
  console.error("Query error:", error);
}

/**
 * Global error handler for React Query mutations
 */
export function handleMutationError(error: unknown): void {
  const message = getErrorMessage(error);

  // Handle network errors
  if (isNetworkError(error)) {
    toast.error("Connection error. Please check your internet and try again.");
    return;
  }

  // Handle auth errors
  if (isAuthError(error)) {
    toast.error("Your session has expired. Please sign in again.");
    return;
  }

  // Show generic error for mutations
  toast.error(message);

  // Log unexpected errors
  console.error("Mutation error:", error);
}

/**
 * Creates a QueryCache with global error handling
 */
export function createQueryCache(): QueryCache {
  return new QueryCache({
    onError: handleQueryError,
  });
}

/**
 * Creates a MutationCache with global error handling
 */
export function createMutationCache(): MutationCache {
  return new MutationCache({
    onError: handleMutationError,
  });
}

/**
 * Default retry logic for queries
 * Don't retry on 4xx errors (client errors)
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  // Don't retry auth errors
  if (isAuthError(error)) {
    return false;
  }

  // Don't retry after 3 attempts
  if (failureCount >= 3) {
    return false;
  }

  // Retry network errors
  if (isNetworkError(error)) {
    return true;
  }

  // Don't retry other errors by default
  return false;
}
