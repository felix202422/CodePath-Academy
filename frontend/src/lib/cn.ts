/**
 * Tiny class-name joiner. Keeps conditional Tailwind classes readable without
 * pulling in a dependency for one helper.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
