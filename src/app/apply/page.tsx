import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n";
import { localizePrograms } from "@/lib/i18n/programs";
import ProgramPicker from "@/components/ProgramPicker";
import EligibilityAdvisor from "@/components/ai/EligibilityAdvisor";

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const programs = await localizePrograms(locale);

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto w-[90%] py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink-900">{t.apply.chooseTitle}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-ink-500">{t.apply.chooseSubtitle}</p>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-ink-500">
            <span>{t.apply.notSure}</span>
            <EligibilityAdvisor />
          </div>
        </div>
        <ProgramPicker
          programs={programs.map((p) => ({
            code: p.code,
            name: p.name,
            tagline: p.tagline,
            blurb: p.blurb,
            icon: p.icon,
            estMinutes: p.estMinutes,
            sections: p.sections.length,
          }))}
        />
      </main>
    </div>
  );
}
