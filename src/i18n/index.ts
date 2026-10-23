import { useCallback } from 'react';
import { create } from 'zustand';
import { fr } from './fr';
import { en } from './en';
import { nl } from './nl';

/**
 * UI translations. French is the source language: `fr.ts` defines every key,
 * the other languages must have exactly the same keys (typed as `Messages`).
 * The brand keeps its French words in every language: « Pépite & Citron »,
 * a pépite, a citron.
 *
 *  - `t('vote.title')` reads the current language at call time: utils, api.ts,
 *    and components too. App subscribes with useT(), so a language change
 *    re-renders the whole tree (no component is memoised).
 *  - `useT()` in a component that must re-render on its own (rendered
 *    outside App, or memoised).
 *
 * Values: a string with `{name}` placeholders, or a plural form
 * `{ one, other }` picked from `vars.count` (French counts 0 as singular).
 */
export type Plural = { one: string; other: string };
type Dict = { [key: string]: string | Plural | Dict };

export type Messages = typeof fr;

type LeafPaths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | Plural
    ? `${P}${K}`
    : LeafPaths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = LeafPaths<Messages>;
export type TVars = Record<string, string | number>;

export const LANGS = ['fr', 'en', 'nl'] as const;
export type Lang = typeof LANGS[number];

/** Shown in the language picker, each in its own language. */
export const LANG_NAMES: Record<Lang, string> = { fr: 'Français', en: 'English', nl: 'Nederlands' };

const MESSAGES: Record<Lang, Messages> = { fr, en, nl };
const LANG_KEY = 'pepite_lang';

const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

/**
 * The language chosen on this device, else the first supported one in the
 * browser's list, else English (closer than French for, say, a German
 * phone). No browser at all: French.
 */
export function detectLanguage(): Lang {
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch { /* storage unavailable */ }
  if (typeof navigator === 'undefined') return 'fr';
  const list = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of list) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return list.some(Boolean) ? 'en' : 'fr';
}

function applyToDocument(lang: Lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>(set => ({
  lang: detectLanguage(),
  setLang: (lang) => {
    try { window.localStorage.setItem(LANG_KEY, lang); } catch { /* storage unavailable */ }
    applyToDocument(lang);
    set({ lang });
  },
}));
applyToDocument(useLangStore.getState().lang);

export const getLang = (): Lang => useLangStore.getState().lang;
export const setLang = (lang: Lang): void => useLangStore.getState().setLang(lang);

/** BCP 47 locale for dates and numbers. */
export function dateLocale(lang: Lang = getLang()): string {
  return lang === 'en' ? 'en-GB' : lang === 'nl' ? 'nl-BE' : 'fr-BE';
}

function lookup(messages: Messages, key: string): string | Plural | undefined {
  let node: string | Plural | Dict | undefined = messages as Dict;
  for (const part of key.split('.')) {
    if (node == null || typeof node === 'string') return undefined;
    node = (node as Dict)[part];
  }
  return node as string | Plural | undefined;
}

const isPlural = (v: unknown): v is Plural =>
  typeof v === 'object' && v !== null && 'one' in v && 'other' in v;

export function translate(lang: Lang, key: TKey, vars?: TVars): string {
  let value = lookup(MESSAGES[lang], key) ?? lookup(fr, key);
  if (isPlural(value)) {
    const count = Number(vars?.count ?? 0);
    value = new Intl.PluralRules(lang).select(count) === 'one' ? value.one : value.other;
  }
  if (typeof value !== 'string') {
    console.warn('i18n: missing key', key);
    return key;
  }
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match);
}

/** Current language, read at call time (utils, api.ts, non-React code). */
export function t(key: TKey, vars?: TVars): string {
  return translate(getLang(), key, vars);
}

/** In components: re-renders on a language change. */
export function useT(): (key: TKey, vars?: TVars) => string {
  const lang = useLangStore(s => s.lang);
  return useCallback((key: TKey, vars?: TVars) => translate(lang, key, vars), [lang]);
}

export function useLang(): Lang {
  return useLangStore(s => s.lang);
}
