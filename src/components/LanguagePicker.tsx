import { LANGS, LANG_NAMES, useLang, useT, setLang } from '@/i18n';
import { track, EVENTS } from '@/utils/analytics';

/**
 * The app's language on this device (Profil, sign-in, /start, vote screen).
 * `compact`: a discreet row of links, for screens players only pass through.
 */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const t    = useT();
  const lang = useLang();

  const pick = (next: typeof lang) => {
    if (next === lang) return;
    track(EVENTS.LANGUAGE_CHANGED, { lang: next });
    setLang(next);
  };

  if (compact) {
    return (
      <div role="group" aria-label={t('common.language')} style={{
        display: 'flex', justifyContent: 'center', gap: 12, fontSize: 12, marginTop: 16,
      }}>
        {LANGS.map(l => (
          <button key={l} type="button" lang={l} aria-pressed={l === lang} onClick={() => pick(l)} style={{
            background: 'none', border: 'none', padding: 4, cursor: 'pointer',
            color: l === lang ? 'var(--label2)' : 'var(--label3)',
            fontWeight: l === lang ? 700 : 400,
            textDecoration: l === lang ? 'none' : 'underline', textUnderlineOffset: 2,
          }}>
            {LANG_NAMES[l]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginTop: 16,
    }}>
      <label htmlFor="language-picker" style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--label)' }}>
        {t('common.language')}
      </label>
      <select id="language-picker" value={lang} onChange={e => pick(e.target.value as typeof lang)}
        style={{ fontSize: 15, padding: '6px 8px', borderRadius: 8 }}>
        {LANGS.map(l => <option key={l} value={l} lang={l}>{LANG_NAMES[l]}</option>)}
      </select>
    </div>
  );
}
