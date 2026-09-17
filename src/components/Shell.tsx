import { Link } from "react-router-dom";
import { brand } from "../config/brand";
import { useI18n } from "../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Mark() { return <Link className="mark" to="/" aria-label={brand.name}><span className="mark-phones"><i/><i/></span><span>TWO PHONES<em>ONE MYSTERY</em></span></Link>; }
export function Header({ minimal = false }: { minimal?: boolean }) {
  const { t } = useI18n();
  return <header className="site-header"><Mark />{!minimal && <nav aria-label="Primary"><a href="/#how">{t("nav.how")}</a><a href="/#cases">{t("nav.cases")}</a><a href="/#faq">{t("nav.faq")}</a></nav>}<div className="header-actions"><LanguageSwitcher />{!minimal && <Link className="button button-small" to="/play">{t("nav.play")}</Link>}</div></header>;
}
export function Footer() {
  const { t } = useI18n();
  return <footer className="site-footer"><div><Mark /><p>{t("footer.line")}</p></div><div className="footer-links"><Link to="/privacy">{t("footer.privacy")}</Link><Link to="/terms">{t("footer.terms")}</Link><a href={`mailto:${brand.contactEmail}`}>{t("footer.contact")}</a><Link to="/admin/login">{t("footer.admin")}</Link></div><small>© {new Date().getFullYear()} {brand.name}</small></footer>;
}
