// Simple className combiner used by components.
// Accepts strings or falsy values and joins the truthy ones with spaces.
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
