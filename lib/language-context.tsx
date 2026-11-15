"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  Language,
  TranslationKey,
  DICTIONARY,
  detectInitialLanguage,
  detectIsThailandRegion,
} from "./i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isThailand: boolean;
  isLoaded: boolean;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start with "en" by default for SSR consistency, then hydrate detection on client mount
  const [language, setLanguageState] = useState<Language>("en");
  const [isThailand, setIsThailand] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      try {
        const isThRegion = detectIsThailandRegion();
        setIsThailand(isThRegion);

        const initialLang = detectInitialLanguage();
        setLanguageState(initialLang);
      } catch (e) {
        console.warn("Language detection error:", e);
      } finally {
        setIsLoaded(true);
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("quizcraft_lang_v1", lang);
    } catch (e) {
      // ignore
    }
  };

  const toggleLanguage = () => {
    const nextLang = language === "en" ? "th" : "en";
    setLanguage(nextLang);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = DICTIONARY[language] || DICTIONARY.en;
    let text: string = dict[key] || DICTIONARY.en[key] || String(key);

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isThailand,
        isLoaded,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
