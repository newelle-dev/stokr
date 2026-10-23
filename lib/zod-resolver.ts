import type { Resolver, FieldValues, FieldError } from 'react-hook-form';
import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { appendErrors } from 'react-hook-form';
import type { z } from 'zod';

interface FlatFieldError {
  message: string;
  type: string;
  types?: Record<string, string | string[]>;
}

/**
 * Custom Zod resolver compatible with Zod v4 and React Hook Form.
 * Zod v4 replaces `error.errors` with `error.issues`, which causes standard
 * `@hookform/resolvers/zod` (v4.1.3) to fail its `Array.isArray(r.errors)` check
 * and unhandled-throw the raw `ZodError` to the runtime error boundary.
 */
export function zodResolver<TFieldValues extends FieldValues = FieldValues, TContext = unknown>(
  schema: z.ZodType
): Resolver<TFieldValues, TContext> {
  return async (values, _context, options) => {
    try {
      const result = await schema.safeParseAsync(values);

      if (result.success) {
        if (options.shouldUseNativeValidation) {
          validateFieldsNatively({}, options);
        }
        return {
          values: result.data as TFieldValues,
          errors: {},
        };
      }

      const issues = result.error.issues;
      const flatErrors: Record<string, FlatFieldError> = {};

      for (const issue of issues) {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';

        if (!flatErrors[path]) {
          flatErrors[path] = { message: issue.message, type: issue.code };
        }

        if (options.criteriaMode === 'all') {
          const currentTypes = flatErrors[path].types;
          const currentTypeErrors = currentTypes && currentTypes[issue.code];
          flatErrors[path] = appendErrors(
            path,
            true,
            flatErrors as Record<string, FieldError>,
            issue.code,
            currentTypeErrors
              ? ([] as string[]).concat(currentTypeErrors, issue.message)
              : issue.message
          ) as FlatFieldError;
        }
      }

      return {
        values: {} as Record<string, never>,
        errors: toNestErrors(flatErrors, options),
      };
    } catch (error) {
      throw error;
    }
  };
}
