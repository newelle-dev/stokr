/**
 * Standard error and result types for Stokr server actions and operations.
 * Invariant: Never leak raw database error messages or internal stack traces to the UI.
 */

export type ActionError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export function successResult<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function errorResult(
  code: string,
  message: string,
  fieldErrors?: Record<string, string>
): ActionResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
  };
}
