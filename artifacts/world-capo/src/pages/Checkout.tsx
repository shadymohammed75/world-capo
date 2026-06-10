import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TEAMS } from "@/lib/teams";
import { FlagImg } from "@/components/FlagImg";
import { FlagBoard, type Cell } from "@/components/FlagBoard";
import { GRID_COLS, GRID_ROWS } from "@/lib/grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePaymentIntent, getListFlagsQueryOptions } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Lock, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from "@stripe/react-stripe-js";

// ─── Stripe real payment form ──────────────────────────────────
function StripePaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasWallets, setHasWallets] = useState(false);

  // Confirms the PaymentIntent. Shared by the wallet buttons and the card form.
  const confirm = async () => {
    if (!stripe || !elements) return;
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    await confirm();
  };

  return (
    <div className="space-y-5">
      {/* Apple Pay / Google Pay / Link — only renders when a wallet is available */}
      <ExpressCheckoutElement
        onReady={(e) => setHasWallets(!!e.availablePaymentMethods)}
        onConfirm={confirm}
      />

      {hasWallets && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex-1 h-px bg-border" />
          OR PAY WITH CARD
          <span className="flex-1 h-px bg-border" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <PaymentElement options={{ layout: "tabs" }} />
        <Button
          type="submit"
          className="w-full h-12 text-base font-bold uppercase tracking-wider"
          disabled={isProcessing || !stripe || !elements}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </span>
          ) : "Pay €0.70"}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Secured by Stripe · All card data encrypted
        </p>
      </form>
    </div>
  );
}

// ─── Main checkout page ────────────────────────────────────────
export default function Checkout() {
  const { teamId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const team = TEAMS.find(t => t.id === teamId);

  const createIntent = useCreatePaymentIntent();

  // Live board so the player can see (and target) existing flags.
  const { data: flags } = useQuery({ ...getListFlagsQueryOptions(), refetchInterval: 10_000 });

  // The grid cell the player has chosen. Defaults to a random slot.
  const [cell, setCell] = useState<Cell>(() => ({
    col: Math.floor(Math.random() * GRID_COLS),
    row: Math.floor(Math.random() * GRID_ROWS),
  }));
  const coords = { x: cell.col, y: cell.row };

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState<"stripe" | "card">("stripe");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Stripe config
  const [stripeConfig, setStripeConfig] = useState<{ publishableKey: string | null; devMode: boolean; freeMode?: boolean } | null>(null);
  const stripePromise = stripeConfig?.publishableKey
    ? loadStripe(stripeConfig.publishableKey)
    : null;

  useEffect(() => {
    fetch("/api/payments/config")
      .then(r => r.json())
      .then(setStripeConfig)
      .catch(() => setStripeConfig({ publishableKey: null, devMode: true }));
  }, []);

  // Create the PaymentIntent only when the user commits to paying — not on page
  // load. This avoids abandoned intents from bounced visitors, and captures the
  // chosen grid cell at confirm time.
  const startPayment = () => {
    if (!team || paymentIntentId || createIntent.isPending) return;

    // Email is optional, but if provided it must be valid — it's sent to Stripe
    // as receipt_email so the buyer gets an emailed receipt.
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");

    createIntent.mutate(
      { data: { teamId: team.id, x: coords.x, y: coords.y, ...(trimmedEmail ? { email: trimmedEmail } : {}) } },
      {
        onSuccess: (data) => {
          setPaymentIntentId(data.paymentIntentId);
          setClientSecret(data.clientSecret);
        },
        onError: () => {
          toast({ title: "Could not start checkout", description: "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Team not found
      </div>
    );
  }

  // Mock confirm (dev only)
  const confirmMock = async () => {
    if (!paymentIntentId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/payments/confirm-mock/${paymentIntentId}`, { method: "POST" });
      if (!res.ok) throw new Error("Payment failed");
      handleSuccess();
    } catch {
      toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const handleSuccess = () => {
    sessionStorage.setItem("pending_flag_payment", "true");
    setSuccess(true);
    setTimeout(() => setLocation("/"), 2000);
  };

  const handleCardPay = (e: React.FormEvent) => { e.preventDefault(); confirmMock(); };

  // Free-launch placement — no payment. Places the flag directly.
  const placeFree = async () => {
    if (!team) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, x: coords.x, y: coords.y }),
      });
      if (!res.ok) throw new Error("Failed to place flag");
      handleSuccess();
    } catch {
      toast({ title: "Could not place flag", description: "Please try again.", variant: "destructive" });
      setIsProcessing(false);
    }
  };

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

  const isLiveStripe = !!stripeConfig?.publishableKey && !!clientSecret && !!stripePromise;
  const freeMode = !!stripeConfig?.freeMode;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* Header */}
      <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground uppercase tracking-widest text-xs font-bold -ml-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" /> Secure checkout
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">

        {/* LEFT — info + placement preview */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Hang Your Flag
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Supporting <span className="text-foreground font-bold">{team.name}</span>
            </p>
          </div>

          {/* Slot picker — tap a cell to claim it (tap an occupied one to cover a rival) */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
                Pick Your Slot · <span className="text-primary">Tap a cell — tap a flag to cover it</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FlagBoard
                flags={flags ?? []}
                height={260}
                selectable
                selectedCell={cell}
                selectedTeamId={team.id}
                onSelectCell={setCell}
              />
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="space-y-2">
            {["Claim a slot on the global wall", "Cover rivals' flags to take their spot", "Defend your territory all tournament"].map(txt => (
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
              <CardTitle className="text-xl uppercase tracking-wider">{freeMode ? "Place Your Flag" : "Payment Details"}</CardTitle>
              <CardDescription>{freeMode ? "Free during our launch 🎉" : "Secure checkout · €0.70 one-time"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {stripeConfig === null ? (
                <div className="flex items-center justify-center py-8">
                  <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : freeMode ? (
                /* ── FREE LAUNCH MODE — no payment ── */
                <>
                  <div className="bg-secondary/40 p-4 rounded-lg border border-border flex justify-between items-center">
                    <span className="font-medium uppercase tracking-widest text-sm">Total Due</span>
                    <span className="text-2xl font-black text-primary">FREE</span>
                  </div>
                  <Button
                    onClick={placeFree}
                    disabled={isProcessing}
                    className="w-full h-14 text-lg font-bold uppercase tracking-wider"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Placing…
                      </span>
                    ) : "Place Your Flag — Free"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Free during our launch. Position your flag on the left, then place it on the wall.
                  </p>
                </>
              ) : (
                /* ── PAID MODE (kept intact for when payments are re-enabled) ── */
                <>

              {/* Amount */}
              <div className="bg-secondary/40 p-4 rounded-lg border border-border flex justify-between items-center">
                <span className="font-medium uppercase tracking-widest text-sm">Total Due</span>
                <span className="text-2xl font-black text-primary">€0.70</span>
              </div>

              {/* ── STEP 1: confirm placement, then start checkout ── */}
              {stripeConfig !== null && !paymentIntentId && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="receipt-email" className="uppercase tracking-wider text-xs text-muted-foreground">
                      Email for receipt <span className="normal-case tracking-normal">(optional)</span>
                    </Label>
                    <Input
                      id="receipt-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                      className="bg-background/50"
                    />
                    {emailError
                      ? <p className="text-destructive text-xs font-medium">{emailError}</p>
                      : <p className="text-xs text-muted-foreground">We'll email you a receipt for your €0.70 payment.</p>}
                  </div>

                  <Button
                    onClick={startPayment}
                    disabled={createIntent.isPending}
                    className="w-full h-14 text-lg font-bold uppercase tracking-wider"
                  >
                    {createIntent.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Preparing…
                      </span>
                    ) : "Continue to Payment · €0.70"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Position your flag on the left, then continue to pay.
                  </p>
                </>
              )}

              {/* ── LIVE STRIPE MODE ── */}
              {isLiveStripe && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: clientSecret!,
                    appearance: {
                      theme: "night",
                      variables: { colorPrimary: "#4ade80", colorBackground: "#0f1f0f", borderRadius: "8px" },
                    },
                  }}
                >
                  <StripePaymentForm onSuccess={handleSuccess} />
                </Elements>
              )}

              {/* ── DEV / MOCK MODE ── */}
              {paymentIntentId && !isLiveStripe && stripeConfig !== null && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTab("stripe")}
                      className={`py-2 rounded-lg border text-sm font-semibold transition-all ${tab === "stripe" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                    >
                       Pay
                    </button>
                    <button
                      onClick={() => setTab("card")}
                      className={`py-2 rounded-lg border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === "card" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      <CreditCard className="w-4 h-4" /> Card
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {tab === "stripe" ? (
                      <motion.div key="mock-pay" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <button
                          onClick={confirmMock}
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
                            <span className="flex items-center justify-center gap-2 text-xl"> Pay €0.70</span>
                          )}
                        </button>
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          Simulated · Add Stripe keys to process real payments
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div key="mock-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <form onSubmit={handleCardPay} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="uppercase tracking-wider text-xs text-muted-foreground">Cardholder Name</Label>
                            <Input required placeholder="John Doe" className="bg-background/50" autoComplete="name" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="uppercase tracking-wider text-xs text-muted-foreground">Card Number</Label>
                            <Input required placeholder="0000 0000 0000 0000" className="bg-background/50 font-mono" maxLength={19} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="uppercase tracking-wider text-xs text-muted-foreground">Expiry</Label>
                              <Input required placeholder="MM/YY" className="bg-background/50 font-mono" maxLength={5} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="uppercase tracking-wider text-xs text-muted-foreground">CVV</Label>
                              <Input required placeholder="123" className="bg-background/50 font-mono" maxLength={4} />
                            </div>
                          </div>
                          <Button type="submit" className="w-full h-12 text-base font-bold uppercase tracking-wider" disabled={isProcessing || !paymentIntentId}>
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
                </>
              )}

                </>
              )}

            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
