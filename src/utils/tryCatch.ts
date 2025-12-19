type Success<T> = {
  data: T;
  error: null;
};

type Failure<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Tries to execute a value (either a promise or a synchronous value) and returns a result object.
 * If the value is a promise, it will be awaited. If the value is synchronous, it will be executed.
 * If the value throws an error, the error will be caught and returned in the result object.
 * @param value The value to be tried. It can be a promise or a synchronous value.
 * @returns A result object containing the data if the value was successful, or the error if the value failed.
 * @example
 * ```typescript
 * const result = tryCatch(fetch('/api/users'));
 * // Handle error
 * if (result.error) {
 *   console.error(result.error);
 *   return;
 * }
 * // Error has been handled above so we can be sure that result.data is not null.
 * console.log(result.data);
 * ```
 */
export async function tryCatch<T, E = Error>(value: Promise<T> | T): Promise<Result<T, E>> {
  try {
    const data = value instanceof Promise ? await value : value;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}