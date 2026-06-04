// i18n: detects the phone language, falls back to English, lets the player override
// it, and re-checks when the app returns to the foreground so a change in the phone's
// language settings is picked up automatically.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { Lang, STRINGS, SUPPORTED_LANGS, LANG_NAMES } from "./strings";

export type { Lang } from "./strings";
export { SUPPORTED_LANGS, LANG_NAMES } from "./strings";

// "system" follows the phone; otherwise an explicit language override.
export type LangSetting = "system" | Lang;

const STORAGE_KEY = "bb21_lang_v1";

export function detectDeviceLang(): Lang {
  try {
    for (const loc of Localization.getLocales()) {
      const code = (loc.languageCode || "").toLowerCase();
      if ((SUPPORTED_LANGS as string[]).includes(code)) return code as Lang;
    }
  } catch {
    // ignore — fall back to English
  }
  return "en";
}

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(params[k]));
  }
  return s;
}

interface I18nValue {
  lang: Lang; // the resolved language currently in use
  setting: LangSetting; // the stored preference ("system" or a language)
  setSetting: (s: LangSetting) => void;
  t: TFunc;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [setting, setSettingState] = useState<LangSetting>("system");
  const [device, setDevice] = useState<Lang>(detectDeviceLang());

  // load the saved preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "system" || (SUPPORTED_LANGS as string[]).includes(v ?? "")) {
        setSettingState(v as LangSetting);
      }
    });
  }, []);

  // re-detect the phone language whenever the app comes back to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setDevice(detectDeviceLang());
    });
    return () => sub.remove();
  }, []);

  const setSetting = useCallback((s: LangSetting) => {
    setSettingState(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  }, []);

  const lang: Lang = setting === "system" ? device : setting;
  const t = useCallback<TFunc>((key, params) => translate(lang, key, params), [lang]);

  const value = useMemo<I18nValue>(() => ({ lang, setting, setSetting, t }), [lang, setting, setSetting, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
