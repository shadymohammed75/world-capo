import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { TEAMS } from "@/lib/teams";
import { FlagImg } from "@/components/FlagImg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePaymentIntent } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Lock, CreditCard } from "lucide-react";
import { Link } from "wouter";

export default function Checkout() {
  const { teamId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const team = TEAMS.find(t => t.id === teamId);

  const createIntent = useCreatePaymentIntent();

  // Start at a random position on the 2000×1500 canvas
  const [coords, setCoords] = useState(() => ({
    x: Math.floor(Math.random() * 1800 + 100),
    y: Math.floor(Math.random() * 1300 + 100),
  }));

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState<"card" | "apple">("apple");

  // Track drag state for the preview flag
  const isDraggingFlag = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [flagPos, setFlagPos] = useState({ x: 150, y: 100 }); // position within preview box

  useEffect(() => {
    if (team && !paymentIntentId && !createIntent.isPending) {
      createIntent.mutate(
        { data: { teamId: team.id, x: coords.x, y: coords.y } },
        { onSuccess: (data) => setPaymentIntentId(data.paymentIntentId) }
      );
    }
  }, [team]);

  if (!team) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Team not found
      </div>
    );
  }

  const confirmPayment = async () => {
    if (!paymentIntentId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/payments/confirm-mock/${paymentIntentId}`, { method: "POST" });
      if (!res.ok) throw new Error("Payment failed");
      sessionStorage.setItem("pending_flag_payment", "true");
      setSuccess(true);
      setTimeout(() => setLocation("/"), 2000);
    } catch {
      toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const handleCardPay = (e: React.FormEvent) => {
    e.preventDefault();
    confirmPayment();
  };

  // Shared move logic
  const applyMove = (clientX: number, clientY: number, rect: DOMRect) => {
    const newX = Math.max(16, Math.min(rect.width - 32, clientX - rect.left));
    const newY = Math.max(16, Math.min(rect.height - 32, clientY - rect.top));
    setFlagPos({ x: newX, y: newY });
    setCoords({
      x: Math.round((newX / rect.width) * 2000),
      y: Math.round((newY / rect.height) * 1500),
    });
  };

  // Mouse drag
  const handleFlagMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingFlag.current = true;
  };
  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingFlag.current) return;
    applyMove(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };
  const handlePreviewMouseUp = () => { isDraggingFlag.current = false; };

  // Touch drag
  const previewRef = useRef<HTMLDivElement>(null);
  const handlePreviewTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isDraggingFlag.current = true;
  };
  const handlePreviewTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingFlag.current || !previewRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    applyMove(t.clientX, t.clientY, previewRef.current.getBoundingClientRect());
  };
  const handlePreviewTouchEnd = () => { isDraggingFlag.current = false; };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <FlagImg emoji={team.flag} size={96} alt={team.name} className="mx-auto" />
          <h2 className="text-3xl font-black text-primary uppercase tracking-wider">Flag Placed!</h2>
          <p className="text-muted-foreground">Your flag is now live on the wall. Redirecting…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* Minimal header */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground uppercase tracking-widest text-xs font-bold -ml-2">
            <ChevronLeft className="w-4 h-4" /> Back to Wall
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" /> Secure checkout
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* LEFT — info + preview */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Hang Your Flag
            </h1>
            <p className="text-muted-foreground mt-1">
              You are supporting <span className="text-foreground font-bold">{team.name}</span>
            </p>
          </div>

          {/* Mini wall preview — drag flag to pick placement */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
                Placement Preview · <span className="text-primary">Drag the flag to choose your spot</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={previewRef}
                className="relative bg-black/40 rounded-lg border border-white/5 overflow-hidden select-none touch-none"
                style={{ height: 260 }}
                onMouseMove={handlePreviewMouseMove}
                onMouseUp={handlePreviewMouseUp}
                onMouseLeave={handlePreviewMouseUp}
                onTouchStart={handlePreviewTouchStart}
                onTouchMove={handlePreviewTouchMove}
                onTouchEnd={handlePreviewTouchEnd}
              >
                {/* grid bg */}
                <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(#2a4a2a 1px, transparent 1px), linear-gradient(90deg, #2a4a2a 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                {/* draggable flag */}
                <div
                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{ left: flagPos.x, top: flagPos.y, transform: "translate(-50%,-50%)" }}
                  onMouseDown={handleFlagMouseDown}
                >
                  <FlagImg
                    emoji={team.flag}
                    size={56}
                    alt={team.name}
                    style={{ filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.9))", pointerEvents: "none" }}
                  />
                </div>

                <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-muted-foreground uppercase tracking-widest pointer-events-none">
                  Touch &amp; drag to position your flag
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What you get */}
          <div className="space-y-2">
            {["Your flag placed live on the global wall", "Visible to fans worldwide", "Permanent for the World Cup 2026"].map(txt => (
              <div key={txt} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-primary">✓</span> {txt}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — payment */}
        <div>
          <Card className="border-primary/20 bg-card/80 backdrop-blur shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/60" />
            <CardHeader>
              <CardTitle className="text-xl uppercase tracking-wider">Payment Details</CardTitle>
              <CardDescription>Secure checkout · €0.70 one-time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Amount */}
              <div className="bg-secondary/40 p-4 rounded-lg border border-border flex justify-between items-center">
                <span className="font-medium uppercase tracking-widest text-sm">Total Due</span>
                <span className="text-2xl font-black text-primary">€0.70</span>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTab("apple")}
                  className={`py-2 rounded-lg border text-sm font-semibold transition-all ${tab === "apple" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border/80"}`}
                >
                   Pay
                </button>
                <button
                  onClick={() => setTab("card")}
                  className={`py-2 rounded-lg border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === "card" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border/80"}`}
                >
                  <CreditCard className="w-4 h-4" /> Card
                </button>
              </div>

              <AnimatePresence mode="wait">
                {tab === "apple" ? (
                  <motion.div key="apple" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <button
                      onClick={confirmPayment}
                      disabled={isProcessing || !paymentIntentId}
                      className="w-full h-14 rounded-xl font-semibold text-lg tracking-wide transition-all disabled:opacity-50"
                      style={{ background: isProcessing ? "#333" : "#000", color: "#fff", border: "none", cursor: isProcessing ? "not-allowed" : "pointer" }}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2 text-xl">
                           Pay €0.70
                        </span>
                      )}
                    </button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Simulated in dev mode · Add Stripe keys for real Apple Pay
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <form onSubmit={handleCardPay} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="uppercase tracking-wider text-xs text-muted-foreground">Cardholder Name</Label>
                        <Input id="name" required placeholder="John Doe" className="bg-background/50" autoComplete="name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="card" className="uppercase tracking-wider text-xs text-muted-foreground">Card Number</Label>
                        <Input id="card" required placeholder="0000 0000 0000 0000" className="bg-background/50 font-mono" maxLength={19} autoComplete="cc-number" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="expiry" className="uppercase tracking-wider text-xs text-muted-foreground">Expiry</Label>
                          <Input id="expiry" required placeholder="MM/YY" className="bg-background/50 font-mono" maxLength={5} autoComplete="cc-exp" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cvv" className="uppercase tracking-wider text-xs text-muted-foreground">CVV</Label>
                          <Input id="cvv" required placeholder="123" className="bg-background/50 font-mono" maxLength={4} autoComplete="cc-csc" />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-bold uppercase tracking-wider"
                        disabled={isProcessing || !paymentIntentId}
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing…
                          </span>
                        ) : "Pay €0.70"}
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
