import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, translate } from "./index.js";
import ko from "./locales/ko.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import zh from "./locales/zh.json";

const dictionaries = { ko, en, ja, zh };

describe("i18n locale resources", () => {
  it("has the same keys across every supported locale", () => {
    const referenceKeys = Object.keys(ko).sort();
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(referenceKeys);
    }
  });

  it("translates a known key", () => {
    expect(translate("en", "common.appName")).toBe("ClassTown");
  });
});
