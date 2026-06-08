import { useState, useRef, useEffect, useMemo } from "react";
import { useListFlags, useGetFlagCounts } from "@workspace/api-client-react";
import { TEAMS } from "@/lib/teams";
import { CookieConsent } from "@/components/CookieConsent";
import { FlagImg } from "@/components/FlagImg";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Crown } from "lucide-react";

export default function Home() {
  const { data: flags, isLoading: loadingFlags } = useListFlags({ query: { refetchInterval: 10_000 } });
  const { data: counts } = useGetFlagCounts({ query: { refetchInterval: 10_000 } });
  const { toast } = useToast();

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const pendingPayment = sessionStorage.getItem("pending_flag_payment");
    if (pendingPayment) {
      toast({ title: "🎉 Flag placed!", description: "Your flag is now live on the global wall!" });
      sessionStorage.removeItem("pending_flag_payment");
    }
  }, [toast]);

  const teamsWithCounts = useMemo(() => {
    return TEAMS.map(team => {
      const serverCount = counts?.find(c => c.teamId === team.id)?.count || 0;
      return { ...team, totalCount: serverCount };
    }).sort((a, b) => b.totalCount - a.totalCount);
  }, [counts]);

  const totalPlaced = useMemo(() => teamsWithCounts.reduce((s, t) => s + t.totalCount, 0), [teamsWithCounts]);
  const leader = teamsWithCounts.find(t => t.totalCount > 0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* ── TOP HEADER ─────────────────────────────────────────── */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tight leading-none text-primary" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              World Capo
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-0.5">
              FIFA World Cup 2026 · Fan Wall
            </p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-2xl font-black text-primary tabular-nums">{totalPlaced.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Placed</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-foreground">48</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Nations</div>
            </div>
            <div className="flex items-center gap-2 pl-6 border-l border-border/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Live</span>
            </div>
          </div>
        </div>

        {/* Announcement bar */}
        <div className="bg-[#1a2a1a] border-t border-green-900/50 px-6 py-2 flex items-center gap-4 text-sm">
          <span className="bg-green-900/60 border border-green-700/50 text-green-300 rounded px-3 py-0.5 text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-2">
            ⚽ USA · Canada · Mexico 2026
          </span>
          <span className="text-muted-foreground">Hang your nation's flag on the world's biggest fan board</span>
          <span className="text-primary font-bold ml-auto shrink-0">only €0.70 per flag</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── CURRENT LEADER ─────────────────────────────────────── */}
        {leader ? (
          <div className="bg-card/60 border border-border/50 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Crown className="w-8 h-8 text-primary fill-primary/30" />
              <FlagImg emoji={leader.flag} size={48} alt={leader.name} />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Current Leader</div>
                <div className="text-2xl font-black uppercase tracking-wide">{leader.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-primary tabular-nums">{leader.totalCount.toLocaleString()} flags</div>
            </div>
          </div>
        ) : (
          <div className="bg-card/60 border border-border/50 rounded-xl p-5 flex items-center gap-4 text-muted-foreground">
            <Crown className="w-7 h-7 opacity-40" />
            <span className="text-sm uppercase tracking-widest">Be the first to hang your nation's flag and claim the top spot</span>
          </div>
        )}

        {/* ── THE GLOBAL WALL ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-black uppercase tracking-wider">The Global Wall</h2>
            <span className="text-xs text-muted-foreground">Drag to explore · Click a nation below to hang your flag</span>
          </div>

          <div
            className="relative overflow-hidden rounded-xl border border-border/40 bg-[#0a0f0a] cursor-grab active:cursor-grabbing"
            style={{ height: 480 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid background */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: 'linear-gradient(#2a4a2a 1px, transparent 1px), linear-gradient(90deg, #2a4a2a 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />

            {/* 2000×1500 canvas */}
            <div
              className="absolute"
              style={{
                width: 2000,
                height: 1500,
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
              }}
            >
              {loadingFlags ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-primary font-bold animate-pulse uppercase tracking-widest text-sm">Loading Wall…</span>
                </div>
              ) : !flags?.length ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm uppercase tracking-widest">Be the first — hang your flag!</span>
                </div>
              ) : (
                flags.map(flag => {
                  const team = TEAMS.find(t => t.id === flag.teamId);
                  if (!team) return null;
                  return (
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      key={flag.id}
                      className="absolute"
                      style={{ left: flag.x, top: flag.y }}
                      title={team.name}
                    >
                      <FlagImg emoji={team.flag} size={36} alt={team.name} style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.9))" }} />
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="absolute bottom-4 right-4 pointer-events-none">
              <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 text-xs text-muted-foreground uppercase tracking-widest">
                Drag to explore
              </div>
            </div>
          </div>
        </div>

        {/* ── NATIONS GRID ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider mb-4">Nations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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

      <CookieConsent />
    </div>
  );
}
