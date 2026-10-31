/** Run the handler only after its asynchronous authorization check succeeds. */
export function withAccessCheck<Args extends unknown[], Result>(
  authorize: () => Promise<void>,
  handler: (...args: Args) => Result
): (...args: Args) => Promise<Awaited<Result>> {
  return async (...args: Args): Promise<Awaited<Result>> => {
    await authorize();
    return await handler(...args);
  };
}
