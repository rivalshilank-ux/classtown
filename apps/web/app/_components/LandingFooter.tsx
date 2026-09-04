import { Logo } from "@classtown/ui";

export function LandingFooter() {
  return (
    <footer className="flex flex-col items-center gap-3 border-t border-neutral-200 px-4 py-10 text-sm text-neutral-500 sm:flex-row sm:justify-between">
      <Logo size="sm" />
      <p>&copy; {new Date().getFullYear()} ClassTown</p>
    </footer>
  );
}
