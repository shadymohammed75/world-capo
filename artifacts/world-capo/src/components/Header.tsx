import { Link } from "wouter";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-background/80 backdrop-blur z-40 flex items-center px-6">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold tracking-tighter">
            WC
          </div>
          <span className="font-sans font-bold text-xl uppercase tracking-wider group-hover:text-primary transition-colors">
            World Capo
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            <span className="text-muted-foreground uppercase tracking-widest text-xs">Live Wall</span>
          </div>
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest text-xs">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
