import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);
  const current = locale === "pt-BR" ? { flag: "🇧🇷", label: "PT-BR" } : { flag: "🇺🇸", label: "EN-US" };
  return <div className="language" ref={root}>
    <button className="language-trigger" type="button" aria-label={t("lang.label")} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span aria-hidden="true">{current.flag}</span><span>{current.label}</span><span className="chevron">⌄</span>
    </button>
    {open && <div className="language-menu" role="listbox" aria-label={t("lang.label")}>
      <button role="option" aria-selected={locale === "pt-BR"} onClick={() => { setLocale("pt-BR"); setOpen(false); }}><span>🇧🇷</span><span><strong>PT-BR</strong><small>{t("lang.pt")}</small></span></button>
      <button role="option" aria-selected={locale === "en-US"} onClick={() => { setLocale("en-US"); setOpen(false); }}><span>🇺🇸</span><span><strong>EN-US</strong><small>{t("lang.en")}</small></span></button>
    </div>}
  </div>;
}
