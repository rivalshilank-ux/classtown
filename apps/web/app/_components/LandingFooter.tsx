import { Logo } from "@classtown/ui";

export function LandingFooter() {
  return (
    <footer className="flex flex-col items-center gap-3 border-t-4 border-ink-900 bg-wood-900 px-4 py-8 text-sm text-cream-400/70 sm:flex-row sm:justify-between">
      <Logo size="sm" />
      <p>&copy; {new Date().getFullYear()} ClassTown</p>
    </footer>
  );
}
