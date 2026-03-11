import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, ShieldCheck, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { storeReferralCode } from "@/lib/referral";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  displayName: z.string().trim().min(2, "Please enter your name"),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, loading } = useAuth();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
  });

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, user]);

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      storeReferralCode(refCode);
      toast.success("Referral code applied to your next Daysi purchase.");
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const validated = authSchema.parse(formData);
      await signIn({
        email: validated.email,
        displayName: validated.displayName,
      });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message ?? "Please check your details.");
        return;
      }

      toast.error(error instanceof Error ? error.message : "Unable to continue to Daysi.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-3xl shadow-xl p-8 border border-border">
          <div className="text-center mb-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-semibold text-foreground mb-3">
              Sign in to Daysi
            </h1>
            <p className="text-muted-foreground text-sm leading-6">
              Access your bookings, orders, and account details.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={formData.displayName}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  className="pl-10"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@daysi.ca"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Open My Daysi Account"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to website
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
