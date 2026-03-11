import { useState, forwardRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Instagram, Facebook, Mail, MapPin, Phone, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { submitDaysiNewsletterSubscription } from "@/lib/daysi-public-api";
import { toast } from "sonner";
const footerLinks = {
  services: [
    { label: "Laser Hair Removal", href: "/services/laser-hair-removal" },
    { label: "Tattoo Removal", href: "/services/tattoo-removal" },
    { label: "Skin Rejuvenation", href: "/services/skin-rejuvenation" },
    { label: "Anti-Aging", href: "/services/anti-aging" },
  ],
  explore: [
    { label: "Before & After", href: "/gallery" },
    { label: "AI Beauty Advisor", href: "/advisor" },
    { label: "Contact Us", href: "/contact" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { data: settings } = useBusinessSettings();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Hidden field for bot detection
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessName = settings?.business_name || "daysi";
  const city = settings?.city || "Niverville";
  const province = settings?.province || "Manitoba";
  const phone = settings?.phone || "(204) 555-1234";
  const contactEmail = settings?.email || "hello@daysi.ca";
  const instagramUrl = settings?.instagram_url || "https://instagram.com/daysi.ca";
  const facebookUrl = settings?.facebook_url || "https://facebook.com/daysi.ca";

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newsletterEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    try {
      if (honeypot.trim()) {
        setNewsletterEmail("");
        setHoneypot("");
        toast.success("Thanks, you're on the list.");
        return;
      }

      await submitDaysiNewsletterSubscription({
        email: newsletterEmail,
        pagePath: window.location.pathname,
        referrer: document.referrer || null,
      });

      toast.success("Thanks, you're on the list.");
      setNewsletterEmail("");
      setHoneypot("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer ref={ref} className="bg-foreground text-white relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-glow-pink/5 pointer-events-none" />
      
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-serif text-xl font-semibold mb-1">Stay Glowing</h3>
              <p className="text-white/60 text-sm">Get skincare tips & exclusive offers delivered to your inbox.</p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex w-full md:w-auto gap-2">
              {/* Honeypot field - hidden from users, visible to bots */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] opacity-0 pointer-events-none"
              />
              <Input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 w-full md:w-64"
                required
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-glow-rose hover:bg-glow-rose/90 text-white shrink-0"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Main Footer */}
      <div className="container mx-auto py-16 lg:py-20 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          
          {/* Brand Column */}
          <div className="space-y-5 text-center lg:text-left">
            <Link to="/" className="inline-flex items-center gap-2 group justify-center lg:justify-start">
              <span className="font-logo text-2xl font-medium tracking-tight lowercase">
                daysi
              </span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed">
              Modern beauty and wellness booking platform. 
              Located in {city}, serving Winnipeg and area.
            </p>
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-glow-pink hover:border-glow-pink transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-glow-pink hover:border-glow-pink transition-all duration-300"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={`mailto:${contactEmail}`}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-glow-pink hover:border-glow-pink transition-all duration-300"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="text-center lg:text-left">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">
              Services
            </h3>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div className="text-center lg:text-left">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">
              Explore
            </h3>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="text-center lg:text-left">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">
              Visit Us
            </h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 justify-center lg:justify-start">
                <MapPin className="w-4 h-4 text-glow-rose flex-shrink-0" />
                <span className="text-white/70 text-sm">{city}, {province}</span>
              </li>
              <li className="flex items-center gap-2 justify-center lg:justify-start">
                <Phone className="w-4 h-4 text-glow-rose flex-shrink-0" />
                <a
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  className="text-white/70 hover:text-white transition-colors text-sm"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-2 justify-center lg:justify-start">
                <Mail className="w-4 h-4 text-glow-rose flex-shrink-0" />
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-white/70 hover:text-white transition-colors text-sm"
                >
                  {contactEmail}
                </a>
              </li>
            </ul>
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white hover:text-foreground animate-glow-pulse mx-auto lg:mx-0" asChild>
              <Link to="/booking">
                Book Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} {businessName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-white/40 hover:text-white/70 transition-colors text-xs"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
