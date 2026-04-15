"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import "flag-icons/css/flag-icons.min.css";

interface LanguageOption {
  value: string;
  label: string;
  countryCode: string;
}

interface LanguageDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const languages: LanguageOption[] = [
  { value: "pt-BR", label: "PT", countryCode: "BR" },
  { value: "en", label: "EN", countryCode: "GB" },
  { value: "es", label: "ES", countryCode: "ES" },
];

export function LanguageDropdown({ value, onChange, className }: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.value === value) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
          "text-muted-foreground",
          "hover:bg-accent",
          "transition-colors"
        )}
      >
        <span className={cn("fi", `fi-${currentLang.countryCode.toLowerCase()}`)} />
        <span>{currentLang.label}</span>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg",
            "bg-popover",
            "border border-border",
            "z-[80] min-w-[100px]"
          )}
        >
          {languages.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => {
                onChange(lang.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium",
                "hover:bg-accent",
                "transition-colors",
                lang.value === value
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <span className={cn("fi", `fi-${lang.countryCode.toLowerCase()}`)} />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
