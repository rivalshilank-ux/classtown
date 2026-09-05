export interface CancelableTask {
  /** Prevents `fn` from running, if it hasn't already. */
  cancel(): void;
}

/**
 * Runs `fn` on a microtask instead of synchronously, and skips it entirely if
 * `cancel()` is called first.
 *
 * This exists for effects with a non-idempotent side effect that a caller
 * cannot safely retry (e.g. spending a single-use token). React StrictMode
 * replays an effect as mount -> cleanup -> mount, synchronously, before
 * yielding to the microtask queue. Without this, the discarded first mount's
 * side effect still fires -- and can race the second (surviving) mount's
 * identical attempt for a resource that only one of them can have.
 * Deferring by a microtask lets the first mount's cleanup cancel it before it
 * ever runs, so exactly one attempt happens per real mount.
 */
export function deferCancelable(fn: () => void): CancelableTask {
  let cancelled = false;
  void Promise.resolve().then(() => {
    if (!cancelled) {
      fn();
    }
  });
  return {
    cancel() {
      cancelled = true;
    },
  };
}
