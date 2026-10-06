/** URL-safe team slug from its name ("Les Lions d'Été" → "les-lions-d-ete"). */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
