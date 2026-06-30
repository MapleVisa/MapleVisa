import Link from "next/link";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n";
import { localizePrograms } from "@/lib/i18n/programs";

export default async function Home() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const programs = await localizePrograms(locale);
  const dest = user ? (user.role === "APPLICANT" ? "/dashboard" : "/admin") : "/signup";

  const steps = [
    { n: "01", t: t.landing.step1Title, d: t.landing.step1Desc },
    { n: "02", t: t.landing.step2Title, d: t.landing.step2Desc },
    { n: "03", t: t.landing.step3Title, d: t.landing.step3Desc },
    { n: "04", t: t.landing.step4Title, d: t.landing.step4Desc },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Training / demo disclaimer */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 sm:text-sm">
        ⚠️ This website is for training and demonstration purposes only. AI Visa does not provide legal
        advice and does not take on real immigration cases.
      </div>

      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <LanguageSwitcher compact />
          {user ? (
            <Link href={dest} className="btn-primary">
              {t.common.goToPortal}
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                {t.common.login}
              </Link>
              <Link href="/signup" className="btn-primary">
                {t.common.getStarted}
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/60 via-white to-white" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="badge bg-brand-100 text-brand-700">{t.landing.badge}</span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl md:text-6xl">
              {t.landing.title} <span className="text-brand-600">{t.landing.titleAccent}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-600">{t.landing.subtitle}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={dest} className="btn-primary px-6 py-3 text-base">
                {t.landing.startApplication}
              </Link>
              <Link href="#programs" className="btn-secondary px-6 py-3 text-base">
                {t.landing.explorePrograms}
              </Link>
            </div>
            <p className="mt-5 text-sm text-ink-400">{t.landing.noPayment}</p>
          </div>
        </div>
      </section>

      <section id="programs" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-ink-900">{t.landing.programsTitle}</h2>
          <p className="mt-3 text-ink-600">{t.landing.programsSubtitle}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {programs.map((p) => (
            <div key={p.code} className="card flex flex-col p-6 transition hover:shadow-card">
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-4 text-lg font-bold text-ink-900">{p.name}</h3>
              <p className="mt-1 text-sm font-medium text-brand-600">{p.tagline}</p>
              <p className="mt-3 flex-1 text-sm text-ink-600">{p.blurb}</p>
              <div className="mt-4 text-xs text-ink-400">
                ≈ {p.estMinutes} {t.landing.minToComplete}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-ink-900">{t.landing.howTitle}</h2>
            <p className="mt-3 text-ink-600">{t.landing.howSubtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl bg-white p-6 shadow-soft">
                <div className="text-3xl font-extrabold text-brand-200">{s.n}</div>
                <h3 className="mt-2 font-bold text-ink-900">{s.t}</h3>
                <p className="mt-2 text-sm text-ink-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-14 text-center text-white shadow-card">
          <h2 className="text-3xl font-bold">{t.landing.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">{t.landing.ctaSubtitle}</p>
          <Link href={dest} className="btn mt-8 bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50">
            {t.landing.ctaButton}
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo />
          <div className="text-center sm:text-end">
            <p className="text-sm text-ink-400">
              © {new Date().getFullYear()} AI Visa. {t.landing.footerNote}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              For training and demonstration only — not legal advice, no real cases handled.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
