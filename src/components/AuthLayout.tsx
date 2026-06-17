import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";
import { getDictionary } from "@/i18n";

export default async function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const t = await getDictionary();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-12 text-white lg:flex">
        <Logo href="/" />
        <div>
          <h2 className="text-3xl font-bold leading-tight">{t.auth.brandHeadline}</h2>
          <ul className="mt-8 space-y-4 text-brand-50">
            {[t.auth.point1, t.auth.point2, t.auth.point3, t.auth.point4].map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm">
                  ✓
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-100/80">© {new Date().getFullYear()} Maple Visa</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:justify-end">
            <div className="lg:hidden">
              <Logo href="/" />
            </div>
            <LanguageSwitcher />
          </div>
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          <p className="mt-2 text-ink-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
