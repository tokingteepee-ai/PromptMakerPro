type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

/**
 * Minimal toast hook used to satisfy imports.
 * In production you can replace this with a full UI toast system.
 */
export function useToast() {
  function toast(options: ToastOptions) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[toast]", options);
    }
  }

  return { toast };
}
