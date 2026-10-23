import { afterEach, describe, expect, it, vi } from 'vitest';
import { fr } from './fr';
import { en } from './en';
import { detectLanguage, setLang, t, translate, useLangStore } from './index';

type Node = string | { [key: string]: Node };

/** Every leaf as [path, text]; a plural yields one entry per form. */
function leaves(node: Node, path = ''): Array<[string, string]> {
  if (typeof node === 'string') return [[path, node]];
  return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

afterEach(() => {
  vi.unstubAllGlobals();
  useLangStore.setState({ lang: 'fr' });
});

describe('dictionaries', () => {
  it('English has every French key, with the same placeholders, and no empty text', () => {
    const frLeaves = new Map(leaves(fr as unknown as Node));
    const enLeaves = new Map(leaves(en as unknown as Node));
    expect([...enLeaves.keys()].sort()).toEqual([...frLeaves.keys()].sort());
    for (const [path, text] of frLeaves) {
      const other = enLeaves.get(path)!;
      expect(other.trim(), path).not.toBe('');
      expect(placeholders(other), path).toEqual(placeholders(text));
    }
  });

  it('keeps the brand in French', () => {
    expect(en.share.text).toContain('Pépite & Citron');
    expect(en.vote.pepiteTitle).toContain('Pépite');
    expect(en.vote.citronTitle).toContain('Citron');
  });
});

describe('translate', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(translate('fr', 'joinOrg.welcome', { team: 'FC Lions' })).toBe('Bienvenue dans FC Lions ! 🎉');
    expect(translate('en', 'joinOrg.welcome', { team: 'FC Lions' })).toBe('Welcome to FC Lions! 🎉');
    expect(translate('en', 'joinOrg.welcome')).toBe('Welcome to {team}! 🎉');
  });

  it('picks plurals by language: French counts 0 as singular, English does not', () => {
    expect(translate('fr', 'common.votes', { count: 0 })).toBe('0 vote');
    expect(translate('fr', 'common.votes', { count: 2 })).toBe('2 votes');
    expect(translate('en', 'common.votes', { count: 0 })).toBe('0 votes');
    expect(translate('en', 'common.votes', { count: 1 })).toBe('1 vote');
  });

  it('t() follows the current language', () => {
    expect(t('common.retry')).toBe('Réessayer');
    setLang('en');
    expect(t('common.retry')).toBe('Try again');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('pepite_lang')).toBe('en');
  });
});

describe('detectLanguage', () => {
  const browser = (languages: string[]) =>
    vi.stubGlobal('navigator', { ...navigator, languages, language: languages[0] });

  it('a choice made on this device wins', () => {
    localStorage.setItem('pepite_lang', 'en');
    browser(['fr-BE']);
    expect(detectLanguage()).toBe('en');
  });

  it('else the first supported language of the browser', () => {
    browser(['fr-BE', 'en']);
    expect(detectLanguage()).toBe('fr');
    browser(['nl-BE', 'en-GB', 'fr']);
    expect(detectLanguage()).toBe('en');
  });

  it('else English, closer than French for an unsupported language', () => {
    browser(['de-DE']);
    expect(detectLanguage()).toBe('en');
  });

  it('ignores a damaged saved choice', () => {
    localStorage.setItem('pepite_lang', 'xx');
    browser(['fr-FR']);
    expect(detectLanguage()).toBe('fr');
  });
});
