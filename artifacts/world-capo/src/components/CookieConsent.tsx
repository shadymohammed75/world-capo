import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRecordConsent } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const recordConsent = useRecordConsent();

  useEffect(() => {
    const consent = localStorage.getItem("gdpr_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleConsent = (analytics: boolean, marketing: boolean) => {
    let sessionId = localStorage.getItem("session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("session_id", sessionId);
    }

    recordConsent.mutate({
      data: {
        sessionId,
        analytics,
        marketing,
      },
    });

    localStorage.setItem("gdpr_consent", "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[400px] z-50"
        >
          <Card className="border-primary/20 bg-card/95 backdrop-blur shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-2 font-sans tracking-tight">Cookie Consent</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We use cookies to enhance your stadium experience. Choose your preference.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleConsent(false, false)}
                >
                  Essential Only
                </Button>
                <Button 
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => handleConsent(true, true)}
                >
                  Accept All
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
