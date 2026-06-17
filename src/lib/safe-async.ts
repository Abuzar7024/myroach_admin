/**
 * Safe async helpers — prevents UI crashes when Firestore/network fails.
 */
export function logServiceError(service: string, error: unknown) {
  if (typeof window !== "undefined") {
    console.warn(`[${service}]`, error);
  }
}

export async function safeList<T>(fn: () => Promise<T[]>, service: string): Promise<T[]> {
  try {
    return await fn();
  } catch (error) {
    logServiceError(service, error);
    return [];
  }
}

export async function safeGet<T>(fn: () => Promise<T | null>, service: string): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logServiceError(service, error);
    return null;
  }
}

export async function safeData<T>(fn: () => Promise<T>, fallback: T, service: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logServiceError(service, error);
    return fallback;
  }
}
