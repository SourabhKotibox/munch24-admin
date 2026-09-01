import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "hi" | "es" | "fr" | "de" | "pt" | "ja" | "zh" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Partial<Record<Language, any>> = {};

// Dynamically import translations
const loadTranslations = async (lang: Language) => {
  if (translations[lang]) return translations[lang];
  try {
    const module = await import(`../locales/${lang}.json`);
    translations[lang] = module.default;
    return module.default;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    return {};
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language") as Language;
    return saved && ["en", "hi", "es", "fr", "de", "pt", "ja", "zh", "ar"].includes(saved) ? saved : "en";
  });
  const [currentTranslations, setCurrentTranslations] = useState<any>(null);

  useEffect(() => {
    loadTranslations(language).then((translations) => {
      setCurrentTranslations(translations);
    });
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    if (!currentTranslations) return key;
    const keys = key.split(".");
    let value: any = currentTranslations;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export const languages: Record<Language, string> = {
  en: "English",
  hi: "हिंदी",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ja: "日本語",
  zh: "中文",
  ar: "العربية",
};
