/**
 * Global type declaration for the Umami analytics tracker.
 * Injected by the <script> tag in app.html — optional at runtime.
 */

type UmamiData = Record<string, string | number | boolean>;

interface UmamiTracker {
  track(event: string, data?: UmamiData): void;
  identify(data: UmamiData): void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

export {};
