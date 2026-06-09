import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { SITE } from "@/lib/site";

export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="border-b border-border/40 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground uppercase tracking-widest text-xs font-bold -ml-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <Link href="/" className="font-black uppercase tracking-wider text-primary text-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {SITE.name}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {title}
        </h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8">
          Last updated: {SITE.lastUpdated}
        </p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:mt-8 [&_h2]:mb-2 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
