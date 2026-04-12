import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { translations, Language, LANGUAGES } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

export { LANGUAGES };
export type { Language };

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLang] = useState<Language>(() => {
    return (localStorage.getItem("agrismart_lang") as Language) || "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    localStorage.setItem("agrismart_lang", lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    const val = translations[key];
    if (!val) {
      console.warn(`[i18n] Missing translation key: "${key}"`);
      return key;
    }
    let text = val[language] || val["en"] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
