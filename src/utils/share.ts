export const SITE_URL = 'https://pepite-citron.com';

export type ShareCampaign = 'results' | 'podium';

/**
 * Landing link appended to what teams share in their chats, tagged with
 * utm_* so Umami attributes the visits (the landing keeps query strings).
 */
export function sharedLandingUrl(campaign: ShareCampaign): string {
  return `${SITE_URL}/?utm_source=share&utm_campaign=${campaign}`;
}
