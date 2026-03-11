import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import glassSkinPortrait from "@/assets/glass-skin-portrait.jpg";
import heroFace2 from "@/assets/hero-face-2.jpg";
import heroFace3 from "@/assets/hero-face-3.jpg";
import heroFace4 from "@/assets/hero-face-4.jpg";

interface ServiceItem {
  slug: string;
  title: string;
  shortDescription: string;
  image: string;
  ctaText: string;
}

const allServices: ServiceItem[] = [
  {
    slug: "laser-hair-removal",
    title: "Laser Hair Removal",
    shortDescription: "Permanent hair reduction with Health Canada approved technology. Safe for all skin tones.",
    image: glassSkinPortrait,
    ctaText: "Learn about laser hair removal",
  },
  {
    slug: "tattoo-removal",
    title: "Tattoo Removal",
    shortDescription: "Advanced laser technology to fade or completely remove unwanted tattoos safely.",
    image: heroFace2,
    ctaText: "Explore tattoo removal options",
  },
  {
    slug: "skin-rejuvenation",
    title: "Skin Rejuvenation",
    shortDescription: "Restore your skin's natural glow with treatments targeting texture, tone, and clarity.",
    image: heroFace3,
    ctaText: "Discover skin rejuvenation",
  },
  {
    slug: "anti-aging",
    title: "Anti-Aging Treatments",
    shortDescription: "Turn back time with non-invasive treatments that reduce wrinkles and restore firmness.",
    image: heroFace4,
    ctaText: "View anti-aging solutions",
  },
];

interface RelatedServicesProps {
  currentService: string;
  maxItems?: number;
}

export function RelatedServices({ currentService, maxItems = 3 }: RelatedServicesProps) {
  // Filter out the current service and limit to maxItems
  const relatedServices = allServices
    .filter((service) => service.slug !== currentService)
    .slice(0, maxItems);

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Explore More
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold mt-3">
            Related Services
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Discover other treatments that complement your beauty goals at Prairie Glow Beauty in Niverville, MB.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {relatedServices.map((service, index) => (
            <motion.div
              key={service.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={`/services/${service.slug}`}
                className="group block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-xl transition-all duration-300"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={service.image}
                    alt={`${service.title} treatment at Prairie Glow Beauty Niverville MB`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {service.shortDescription}
                  </p>
                  <span className="inline-flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                    {service.ctaText}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Additional Internal Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground mb-4">
            Ready to start your transformation?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/pricing"
              className="text-primary hover:underline font-medium"
            >
              View all pricing and packages →
            </Link>
            <Link
              to="/gallery"
              className="text-primary hover:underline font-medium"
            >
              See before & after results →
            </Link>
            <Link
              to="/booking"
              className="text-primary hover:underline font-medium"
            >
              Book your free consultation →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
