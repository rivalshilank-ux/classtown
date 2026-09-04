import ko from "./locales/ko.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import zh from "./locales/zh.json";

export type SupportedLocale = "ko" | "en" | "ja" | "zh";

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  "ko",
  "en",
  "ja",
  "zh",
];

export const DEFAULT_LOCALE: SupportedLocale = "ko";

const dictionaries = { ko, en, ja, zh } satisfies Record<
  SupportedLocale,
  Record<string, string>
>;

export type TranslationKey = keyof typeof ko;

export function translate(locale: SupportedLocale, key: TranslationKey): string {
  return (
    dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key
  );
}
