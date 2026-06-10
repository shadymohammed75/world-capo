import { Link } from "wouter";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <div className="font-black uppercase tracking-wider text-primary" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {SITE.name}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            © {new Date().getFullYear()} {SITE.company}. World Cup 2026 fan wall. An unofficial fan project, not affiliated with any official competition organiser.
          </p>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6 text-xs uppercase tracking-widest text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <a href={`mailto:${SITE.contactEmail}`} className="hover:text-foreground transition-colors">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
