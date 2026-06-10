import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getListFlagsQueryOptions, getGetFlagCountsQueryOptions } from "@workspace/api-client-react";
import { TEAMS } from "@/lib/teams";
import { CookieConsent } from "@/components/CookieConsent";
import { Footer } from "@/components/Footer";
import { FlagImg } from "@/components/FlagImg";
import { FlagBoard } from "@/components/FlagBoard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Crown, Share2 } from "lucide-react";

export default function Home() {
  const { data: flags, isLoading: loadingFlags } = useQuery({ ...getListFlagsQueryOptions(), refetchInterval: 10_000 });
  const { data: counts } = useQuery({ ...getGetFlagCountsQueryOptions(), refetchInterval: 10_000 });

  const [freeMode, setFreeMode] = useState(false);
  useEffect(() => {
    fetch("/api/payments/config")
      .then(r => r.json())
      .then(c => setFreeMode(!!c.freeMode))
      .catch(() => {});
  }, []);

  const teamsWithCounts = useMemo(() => {
    return TEAMS.map(team => {
      const serverCount = counts?.find(c => c.teamId === team.id)?.count || 0;
      return { ...team, totalCount: serverCount };
    }).sort((a, b) => b.totalCount - a.totalCount);
  }, [counts]);

  const totalPlaced = useMemo(() => teamsWithCounts.reduce((s, t) => s + t.totalCount, 0), [teamsWithCounts]);
  const leader = teamsWithCounts.find(t => t.totalCount > 0);

  const { toast } = useToast();
  const handleShare = async () => {
    const shareData = {
      title: "World Capo",
      text: "Help cover the World Cup 2026 wall with our flag! 🏴 Place yours, cover rivals, and push our nation to the top.",
      url: typeof window !== "undefined" ? window.location.origin : "",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast({ title: "Link copied!", description: "Share it with your friends to grow your nation's flags." });
      }
    } catch {
      /* user dismissed the share sheet — nothing to do */
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* ── TOP HEADER ─────────────────────────────────────────── */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-none text-primary" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                World Capo
              </h1>
              <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                World Cup 2026 · Fan Wall
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 sm:gap-8 shrink-0">
              <div className="text-right">
                <div className="text-lg sm:text-2xl font-black text-primary tabular-nums">{totalPlaced.toLocaleString()}</div>
                <div className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-widest">Placed</div>
              </div>
              <div className="text-right hidden xs:block sm:block">
                <div className="text-lg sm:text-2xl font-black text-foreground">48</div>
                <div className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-widest">Nations</div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 pl-3 sm:pl-6 border-l border-border/50">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-green-400 uppercase tracking-widest">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Announcement bar */}
        <div className="bg-[#1a2a1a] border-t border-green-900/50 px-4 sm:px-6 py-2 flex items-center gap-3 text-sm">
          <span className="bg-green-900/60 border border-green-700/50 text-green-300 rounded px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0">
            ⚽ 2026
          </span>
          <span className="text-muted-foreground text-xs truncate">Cover the board with your nation's flag — before rivals cover yours</span>
          <span className="text-primary font-bold ml-auto shrink-0 text-xs sm:text-sm">{freeMode ? "FREE" : "€0.70"}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* ── SLOGAN / GOAL ──────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Cover the board with your flag
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Plant your nation's flag, cover rivals' slots, and rally your friends — the country that
              covers the most of the wall wins. Every flag counts.
            </p>
          </div>
          <Button onClick={handleShare} className="gap-2 uppercase tracking-wider font-bold shrink-0 w-full sm:w-auto">
            <Share2 className="w-4 h-4" /> Share with friends
          </Button>
        </div>

        {/* ── CURRENT LEADER ─────────────────────────────────────── */}
        {leader ? (
          <div className="bg-card/60 border border-border/50 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-primary fill-primary/30 shrink-0" />
              <FlagImg emoji={leader.flag} size={36} alt={leader.name} />
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Current Leader</div>
                <div className="text-lg sm:text-2xl font-black uppercase tracking-wide truncate">{leader.name}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl sm:text-3xl font-black text-primary tabular-nums">{leader.totalCount.toLocaleString()} <span className="text-sm sm:text-base">flags</span></div>
            </div>
          </div>
        ) : (
          <div className="bg-card/60 border border-border/50 rounded-xl p-4 flex items-center gap-3 text-muted-foreground">
            <Crown className="w-6 h-6 opacity-40 shrink-0" />
            <span className="text-xs sm:text-sm uppercase tracking-widest">Be the first to hang your nation's flag</span>
          </div>
        )}

        {/* ── THE GLOBAL WALL ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-base sm:text-xl font-black uppercase tracking-wider">The Global Wall</h2>
            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">Drag to explore · Cover rivals to win slots</span>
          </div>

          {loadingFlags ? (
            <div className="relative overflow-hidden rounded-xl border border-border/40 bg-[#0a0f0a] flex items-center justify-center" style={{ height: 320 }}>
              <span className="text-primary font-bold animate-pulse uppercase tracking-widest text-sm">Loading Wall…</span>
            </div>
          ) : (
            <FlagBoard flags={flags ?? []} height={320} />
          )}
        </div>

        {/* ── NATIONS GRID ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-base sm:text-xl font-black uppercase tracking-wider mb-3 sm:mb-4">
            Choose Your Nation
          </h2>

          {/* Mobile: list rows. Desktop: grid cards */}
          <div className="flex flex-col sm:hidden gap-2">
            {teamsWithCounts.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.01 }}
              >
                <Link href={`/checkout/${team.id}`}>
                  <div className="bg-card/60 border border-border/50 active:border-primary/60 active:bg-card rounded-xl px-4 py-3 flex items-center gap-3">
                    <FlagImg emoji={team.flag} size={36} alt={team.name} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm uppercase tracking-wide truncate">{team.name}</div>
                      <div className="text-xs text-muted-foreground">{team.totalCount} flags placed</div>
                    </div>
                    <Button size="sm" className="h-8 px-4 text-xs uppercase tracking-wider font-bold shrink-0">
                      Hang Flag
                    </Button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Desktop grid */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {teamsWithCounts.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Link href={`/checkout/${team.id}`}>
                  <div className="bg-card/60 border border-border/50 hover:border-primary/60 hover:bg-card transition-all rounded-xl p-4 flex flex-col items-center gap-2 text-center group cursor-pointer">
                    <FlagImg emoji={team.flag} size={40} alt={team.name} />
                    <div className="font-bold text-xs uppercase tracking-wide group-hover:text-primary transition-colors">{team.name}</div>
                    <div className="text-sm font-black text-primary tabular-nums">{team.totalCount}</div>
                    <Button size="sm" className="h-6 text-[10px] w-full uppercase tracking-wider font-bold">
                      Hang
                    </Button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
      <CookieConsent />
    </div>
  );
}
