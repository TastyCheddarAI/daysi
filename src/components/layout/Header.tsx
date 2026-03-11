import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CartIcon } from "@/components/cart/CartIcon";
import { CartDrawer } from "@/components/cart/CartDrawer";

const serviceLinks = [
  { href: "/services/laser-hair-removal", label: "Laser Hair Removal" },
  { href: "/services/tattoo-removal", label: "Tattoo Removal" },
  { href: "/services/skin-rejuvenation", label: "Skin Rejuvenation" },
  { href: "/services/anti-aging", label: "Anti-Aging Treatments" },
];

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/treatment", label: "Glass Facial" },
  { href: "/gallery", label: "Before & After" },
  { href: "/pricing", label: "Pricing" },
  { href: "/advisor", label: "AI Advisor" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const location = useLocation();
  const isLoggedIn = !!user;
  const isServicePage = location.pathname.startsWith("/services/");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsServicesOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) {
        setIsServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-xl shadow-soft py-4"
          : "bg-white/80 backdrop-blur-sm py-5"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-logo text-2xl md:text-3xl font-medium tracking-tight lowercase">
            daysi
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.slice(0, 2).map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
                location.pathname === link.href
                  ? "text-primary"
                  : "text-foreground/70 hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Services Dropdown */}
          <div ref={servicesRef} className="relative">
            <button
              onClick={() => setIsServicesOpen(!isServicesOpen)}
              className={`px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                isServicePage
                  ? "text-primary"
                  : "text-foreground/70 hover:text-primary"
              }`}
            >
              Services
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isServicesOpen ? "rotate-180" : ""}`} />
            </button>
            
            <AnimatePresence>
              {isServicesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-border overflow-hidden"
                >
                  {serviceLinks.map((link, index) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={`block px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        location.pathname === link.href
                          ? "text-primary bg-secondary"
                          : "text-foreground/80 hover:text-primary hover:bg-accent"
                      } ${index !== serviceLinks.length - 1 ? "border-b border-border/50" : ""}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {navLinks.slice(2).map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
                location.pathname === link.href
                  ? "text-primary"
                  : "text-foreground/70 hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <CartIcon />
          <CartDrawer />
          <Button variant="ghost" size="sm" asChild>
            <Link to={isLoggedIn ? "/dashboard" : "/auth"}>
              <User className="w-4 h-4 mr-2" />
              {isLoggedIn ? "My Account" : "Login"}
            </Link>
          </Button>
          <Button variant="hero" size="default" asChild>
            <Link to="/booking">Book Now</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-white/98 backdrop-blur-xl border-t border-border"
          >
            <nav className="container mx-auto py-6 flex flex-col gap-2">
              {navLinks.slice(0, 2).map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={link.href}
                    className={`block px-4 py-3 text-lg font-medium rounded-xl transition-all ${
                      location.pathname === link.href
                        ? "text-primary bg-secondary"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              
              {/* Services Section in Mobile */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="px-4 py-3 text-lg font-medium text-foreground/60">
                  Services
                </div>
                <div className="pl-4 flex flex-col gap-1">
                  {serviceLinks.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + index * 0.05 }}
                    >
                      <Link
                        to={link.href}
                        className={`block px-4 py-2 text-base font-medium rounded-xl transition-all ${
                          location.pathname === link.href
                            ? "text-primary bg-secondary"
                            : "text-foreground/80 hover:bg-accent"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {navLinks.slice(2).map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                >
                  <Link
                    to={link.href}
                    className={`block px-4 py-3 text-lg font-medium rounded-xl transition-all ${
                      location.pathname === link.href
                        ? "text-primary bg-secondary"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 }}
                className="mt-4 flex flex-col gap-2"
              >
                <CartIcon />
                <Button variant="outline" className="w-full" asChild>
                  <Link to={isLoggedIn ? "/dashboard" : "/auth"}>
                    <User className="w-4 h-4 mr-2" />
                    {isLoggedIn ? "My Account" : "Login"}
                  </Link>
                </Button>
                <Button variant="hero" size="lg" className="w-full" asChild>
                  <Link to="/booking">Book Your Session</Link>
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
