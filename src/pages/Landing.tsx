import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Footer, Header } from "../components/Shell";
import { useI18n } from "../i18n";
import { track } from "../lib/api";

function PhonePair() {
  const { t } = useI18n();
  return (
    <div className="phone-pair" aria-label="Two synchronized evidence phones">
      <div className="phone phone-left">
        <div className="phone-bar"><span>00:17</span><i /></div>
        <div className="packet-label">{t("phones.archive")}</div>
        <div className="file-stamp">ENCRYPTED<br />PACKET_01</div>
        <div className="message-card"><small>MAYA REED · SCHEDULED</small><p>{t("phones.archiveNote")}</p></div>
        <div className="card-symbols"><b>☾ <em>3</em></b><b>⚿ <em>7</em></b><b>◉ <em>9</em></b></div>
      </div>
      <div className="sync-beam"><span>{t("phones.sync")}</span></div>
      <div className="phone phone-right">
        <div className="phone-bar"><span>00:17</span><i /></div>
        <div className="packet-label">{t("phones.field")}</div>
        <div className="door-image" style={{ backgroundImage: "url('/evidence/room-404-door.webp')" }}><span>404</span><small>CAM 4F-02 · OFFLINE</small></div>
        <div className="message-card warning"><small>PRIVATE INSTRUCTION</small><p>{t("phones.fieldNote")}</p></div>
      </div>
    </div>
  );
}

export function Landing() {
  const { t, locale } = useI18n();
  useEffect(() => { track("landing_view", locale); }, [locale]);
  return (
    <div className="landing">
      <Header />
      <main>
        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-copy">
            <p className="eyebrow"><span /> {t("hero.eyebrow")}</p>
            <h1>{t("hero.line1")}<br /><span>{t("hero.line2")}</span></h1>
            <p className="hero-subtitle">{t("hero.subtitle")}</p>
            <p className="hero-body">{t("hero.body")}</p>
            <div className="hero-actions"><Link className="button button-primary" to="/play" onClick={() => track("play_clicked", locale)}>{t("cta.play")} <b>↗</b></Link><a className="button button-ghost" href="#how">{t("cta.how")} ↓</a></div>
            <div className="hero-trust"><span>✓ {t("hero.free")}</span><span>✓ {t("hero.noaccount")}</span></div>
          </div>
          <PhonePair />
        </section>

        <section id="how" className="how section">
          <div className="section-intro"><p className="kicker">{t("how.kicker")}</p><h2>{t("how.title")}</h2><p>{t("how.body")}</p></div>
          <ol className="steps">{[1, 2, 3, 4].map((step) => <li key={step}><span>0{step}</span><div><h3>{t(`how.${step}.title` as never)}</h3><p>{t(`how.${step}.body` as never)}</p></div></li>)}</ol>
        </section>

        <section id="cases" className="cases section">
          <div className="case-heading"><p className="kicker">{t("cases.kicker")}</p><h2>{t("cases.title")}</h2></div>
          <article className="featured-case">
            <div className="case-photo" style={{ backgroundImage: "url('/evidence/room-404-door.webp')" }}><div className="case-number"><small>CASE</small><strong>001</strong></div><span className="rec">● REC · 00:17:06</span></div>
            <div className="case-copy"><div className="case-meta"><span>{t("case.duration")}</span><span>{t("case.players")}</span><span>{t("case.genre")}</span></div><p className="kicker">HALCYON HOTEL · FOURTH FLOOR</p><h3>ROOM <span>404</span></h3><blockquote>“{t("case.tagline")}”</blockquote><p>{t("case.sub")}</p><div className="case-bottom"><span>{t("case.free")}</span><Link className="button button-primary" to="/play">{t("case.open")} ↗</Link></div></div>
          </article>
          <div className="coming-grid">{[1, 2, 3].map((item) => <article key={item}><span>{t("coming.label")}</span><h3>{t(`coming.${item}` as never)}</h3><div className="redacted" /></article>)}</div>
        </section>

        <section className="pricing section">
          <div className="pricing-copy"><p className="kicker">{t("price.kicker")}</p><h2>{t("price.title")}</h2><p>{t("price.body")}</p><ul><li>✓ {t("price.feature1")}</li><li>✓ {t("price.feature2")}</li><li>✓ {t("price.feature3")}</li></ul></div>
          <div className="price-ticket"><div><small>CASE LICENSE · ROOM 404</small><strong>{t("price.amount")}</strong><span>{t("price.once")}</span></div><Link className="button button-primary" to="/play">{t("cta.play")} ↗</Link></div>
        </section>

        <section id="faq" className="faq section"><h2>{t("faq.title")}</h2><div>{[1, 2, 3, 4].map((item) => <details key={item}><summary>{t(`faq.q${item}` as never)}<span>+</span></summary><p>{t(`faq.a${item}` as never)}</p></details>)}</div></section>
      </main>
      <Footer />
    </div>
  );
}
