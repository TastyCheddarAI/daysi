import { toast } from "sonner";

/**
 * Extracts a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Supabase PostgrestError type for reference
 */
interface PostgrestError {
  message: string;
  details: string | null;
  hint: string | null;
  code: string;
}

/**
 * Handles Supabase errors and returns a user-friendly message
 */
export function getSupabaseErrorMessage(error: PostgrestError | null): string {
  if (!error) return "";
  
  // Common Supabase error codes
  const errorMessages: Record<string, string> = {
    "23505": "This record already exists",
    "23503": "This record is referenced by other data",
    "42501": "You don't have permission to perform this action",
    "PGRST301": "Request timeout - please try again",
    "PGRST116": "Record not found",
  };

  return errorMessages[error.code] || error.message || "Database operation failed";
}

/**
 * Wraps an async operation with error handling
 * Returns a tuple of [data, error] for easier error handling
 */
export async function safeAsync<T>(
  promise: Promise<T>
): Promise<[T, null] | [null, Error]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(getErrorMessage(error))];
  }
}

/**
 * Shows an error toast with consistent formatting
 */
export function showErrorToast(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  toast.error(context ? `${context}: ${message}` : message);
}

/**
 * Shows a success toast with consistent formatting
 */
export function showSuccessToast(message: string): void {
  toast.success(message);
}

/**
 * Determines if an error is a network/connection error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const networkErrorMessages = [
      "Failed to fetch",
      "Network request failed",
      "NetworkError",
      "net::ERR_",
      "ECONNREFUSED",
      "ETIMEDOUT",
    ];
    return networkErrorMessages.some((msg) =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }
  return false;
}

/**
 * Determines if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const errorObj = error as Record<string, unknown>;
    if (
      errorObj.status === 401 ||
      errorObj.code === "PGRST301" ||
      (typeof errorObj.message === "string" &&
        errorObj.message.toLowerCase().includes("auth"))
    ) {
      return true;
    }
  }
  return false;
}
