import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { TEAMS } from "@/lib/teams";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePaymentIntent } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

export default function Checkout() {
  const { teamId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const team = TEAMS.find(t => t.id === teamId);
  
  const createIntent = useCreatePaymentIntent();
  const [coords, setCoords] = useState({ x: 500, y: 300 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (team && !clientSecret && !createIntent.isPending) {
      createIntent.mutate({
        data: { teamId: team.id, x: coords.x, y: coords.y }
      }, {
        onSuccess: (data) => {
          setClientSecret(data.clientSecret);
        }
      });
    }
  }, [team, clientSecret, createIntent, coords]);

  if (!team) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Team not found
      </div>
    );
  }

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      sessionStorage.setItem("pending_flag_payment", "true");
      setLocation("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column - Preview */}
          <div className="space-y-6">
            <Button variant="ghost" className="gap-2 -ml-4 hover:bg-transparent hover:text-primary uppercase tracking-widest text-xs font-bold" onClick={() => setLocation("/")}>
              <ChevronLeft className="w-4 h-4" /> Back to Wall
            </Button>
            
            <div>
              <h1 className="text-4xl font-bold uppercase tracking-wider mb-2">Hang Your Flag</h1>
              <p className="text-muted-foreground text-lg">You are supporting <span className="text-foreground font-bold">{team.name}</span></p>
            </div>
            
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="uppercase tracking-widest text-sm text-muted-foreground">Placement Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black/40 rounded-lg border border-white/5 relative overflow-hidden flex items-center justify-center group">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  
                  <motion.div 
                    className="text-6xl filter drop-shadow-2xl z-10 cursor-move"
                    drag
                    dragConstraints={{ left: -150, right: 150, top: -80, bottom: 80 }}
                    onDragEnd={(_, info) => {
                      setCoords(prev => ({
                        x: prev.x + info.offset.x,
                        y: prev.y + info.offset.y
                      }));
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {team.flag}
                  </motion.div>
                  
                  <div className="absolute bottom-4 text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Drag flag to position
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Payment */}
          <div className="flex items-center">
            <Card className="w-full border-primary/20 bg-card/80 backdrop-blur shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/50" />
              <CardHeader>
                <CardTitle className="text-2xl uppercase tracking-wider">Payment Details</CardTitle>
                <CardDescription>Secure checkout for your piece of the wall</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePay} className="space-y-6">
                  
                  <div className="bg-secondary/50 p-4 rounded-lg border border-border flex justify-between items-center mb-6">
                    <span className="font-medium uppercase tracking-widest text-sm">Total Due</span>
                    <span className="text-2xl font-bold text-primary">€0.70</span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="uppercase tracking-wider text-xs text-muted-foreground">Cardholder Name</Label>
                      <Input id="name" required placeholder="John Doe" className="bg-background/50" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="card" className="uppercase tracking-wider text-xs text-muted-foreground">Card Number</Label>
                      <Input id="card" required placeholder="0000 0000 0000 0000" className="bg-background/50 font-mono" maxLength={19} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry" className="uppercase tracking-wider text-xs text-muted-foreground">Expiry Date</Label>
                        <Input id="expiry" required placeholder="MM/YY" className="bg-background/50 font-mono" maxLength={5} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv" className="uppercase tracking-wider text-xs text-muted-foreground">CVV</Label>
                        <Input id="cvv" required placeholder="123" className="bg-background/50 font-mono" maxLength={4} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-center text-muted-foreground bg-accent/10 text-accent p-3 rounded border border-accent/20">
                    Stripe integration ready — connect your Stripe keys to go live.
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-bold uppercase tracking-wider" 
                    disabled={isProcessing || !clientSecret}
                  >
                    {isProcessing ? "Processing..." : "Pay €0.70"}
                  </Button>
                  
                </form>
              </CardContent>
            </Card>
          </div>
          
        </div>
      </main>
    </div>
  );
}
