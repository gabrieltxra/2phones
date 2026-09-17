import { Footer, Header } from "../components/Shell";
import { useI18n } from "../i18n";

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) { const { t }=useI18n(); return <div className="legal-page"><Header minimal/><main><p className="kicker">TWO PHONES, ONE MYSTERY · LEGAL</p><h1>{t(`${kind}.title` as never)}</h1><p className="legal-notice">{t("legal.notice")}</p><article>{t(`${kind}.body` as never)}</article><p>Last updated: September 10, 2026</p></main><Footer/></div>; }
