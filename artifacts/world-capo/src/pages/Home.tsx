import { useState, useRef, useEffect, useMemo } from "react";
import { useListFlags, useGetFlagCounts } from "@workspace/api-client-react";
import { TEAMS } from "@/lib/teams";
import { Header } from "@/components/Header";
import { CookieConsent } from "@/components/CookieConsent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { data: flags, isLoading: loadingFlags } = useListFlags();
  const { data: counts, isLoading: loadingCounts } = useGetFlagCounts();
  const { toast } = useToast();

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Show success toast if returning from payment
    const pendingPayment = sessionStorage.getItem("pending_flag_payment");
    if (pendingPayment) {
      toast({
        title: "Success",
        description: "Your flag is live on the wall!",
        variant: "default",
      });
      sessionStorage.removeItem("pending_flag_payment");
    }
  }, [toast]);

  const teamsWithCounts = useMemo(() => {
    return TEAMS.map(team => {
      const serverCount = counts?.find(c => c.teamId === team.id)?.count || 0;
      return { ...team, totalCount: team.baseCount + serverCount };
    }).sort((a, b) => b.totalCount - a.totalCount);
  }, [counts]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      <Header />
      
      <main className="flex-1 pt-16 flex relative h-[calc(100vh-64px)]">
        {/* Leaderboard Sidebar */}
        <div className="w-80 border-r border-border/50 bg-card/50 backdrop-blur-sm z-10 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <h2 className="text-xl font-bold uppercase tracking-wider">Top Nations</h2>
            <p className="text-xs text-muted-foreground">Live flag counts</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {loadingCounts ? (
              Array(10).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : (
              teamsWithCounts.map((team, index) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={team.id}
                >
                  <Card className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{team.flag}</span>
                        <div>
                          <div className="font-bold text-sm uppercase tracking-wide group-hover:text-primary transition-colors">{team.name}</div>
                          <div className="text-xs text-muted-foreground">{team.totalCount.toLocaleString()} flags</div>
                        </div>
                      </div>
                      <Link href={`/checkout/${team.id}`} className="shrink-0">
                        <Button size="sm" variant="secondary" className="text-xs h-7 uppercase tracking-wider font-bold">
                          Hang
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Interactive Wall */}
        <div 
          className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-card via-background to-background cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
          
          <div 
            className="absolute top-1/2 left-1/2 w-[2500px] h-[1500px] bg-black/20 border border-white/5 shadow-2xl"
            style={{ 
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`
            }}
          >
            {loadingFlags ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-primary font-bold animate-pulse uppercase tracking-widest">Loading Wall...</span>
              </div>
            ) : (
              flags?.map(flag => {
                const team = TEAMS.find(t => t.id === flag.teamId);
                if (!team) return null;
                return (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    key={flag.id}
                    className="absolute text-2xl filter drop-shadow-md"
                    style={{ left: flag.x, top: flag.y }}
                  >
                    {team.flag}
                  </motion.div>
                );
              })
            )}
          </div>
          
          <div className="absolute bottom-6 right-6 pointer-events-none">
            <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Drag to explore
            </div>
          </div>
        </div>
      </main>
      
      <CookieConsent />
    </div>
  );
}
