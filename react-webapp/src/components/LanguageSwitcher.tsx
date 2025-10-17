import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";

interface Language {
  code: string;
  name: string;
}

const languages: Language[] = [
  { code: "en", name: "English" },
  { code: "th", name: "ไทย" },
  { code: "nl", name: "Nederlands" },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isOpen]);

  const handleLanguageChange = (langCode: string) => {
    console.log("Changing language from", i18n.language, "to", langCode);
    i18n.changeLanguage(langCode);
    setIsOpen(false);
    console.log("Language changed to", i18n.language);
  };

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => {
            console.log("Language switcher clicked, current state:", isOpen);
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl glassmorphism hover:shadow-lg transition-all duration-300 group hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20"
          aria-label={t("language.changeLanguage")}
        >
          <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            {currentLanguage.name}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {isOpen &&
        buttonRect &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0"
              style={{ zIndex: 99998 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div
              className="fixed w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl overflow-hidden"
              style={{
                zIndex: 99999,
                top: buttonRect.bottom + 8,
                left: buttonRect.right - 208, // 208px = w-52
              }}
            >
              <div className="py-2">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageChange(language.code)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 group",
                      language.code === i18n.language
                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 dark:hover:from-gray-800/50 dark:hover:to-indigo-900/20 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <span className="text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {language.name}
                    </span>
                    {language.code === i18n.language && (
                      <div className="ml-auto w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
