/**
 * Copies text to the clipboard.
 *
 * Tries the modern Clipboard API first, then falls back to the legacy
 * execCommand approach for older browsers or non-secure HTTP contexts
 * (e.g., local network access without HTTPS, which is common for PWAs
 * served over a LAN).
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch { /* fall through to execCommand */ }
  }
  // Legacy fallback — works without Clipboard API permission
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}
