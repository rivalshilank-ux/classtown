import { Button } from "@classtown/ui";
import { DEFAULT_LOCALE, translate } from "@classtown/i18n";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">
        {translate(DEFAULT_LOCALE, "common.appName")}
      </h1>
      <p className="text-neutral-900">Phase 0 scaffold — under construction.</p>
      <Button>{translate(DEFAULT_LOCALE, "common.loading")}</Button>
    </main>
  );
}
