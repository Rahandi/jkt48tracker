export function AppFooter() {
  return (
    <footer className="border-t border-border mt-12 px-6 py-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 text-sm text-muted-foreground">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <span className="font-semibold text-foreground">JKT48 Tracker</span>
            {" · "}Data sourced from{" "}
            <a
              href="https://jkt48.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              jkt48.com
            </a>
            {" · "}Not affiliated with JKT48.
          </span>
          <span className="text-xs">
            Built with{" "}
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Claude
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
