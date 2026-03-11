
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Breadcrumb } from "@/components/Breadcrumb";
import beforeAfter from "@/assets/before-after-1.jpg";
import glassSkinPortrait from "@/assets/glass-skin-portrait.jpg";

const galleryItems = [
  {
    id: 1,
    image: beforeAfter,
    title: "Sarah's Transformation",
    description: "After just one session - bridal prep",
    testimonial: "My wedding photos came out perfect!",
    service: "skin-rejuvenation",
    serviceName: "Skin Rejuvenation",
    altText: "Before and after skin rejuvenation facial treatment - bridal prep results at Prairie Glow Beauty Niverville MB",
  },
  {
    id: 2,
    image: glassSkinPortrait,
    title: "Monthly Glow",
    description: "6 months of consistent sessions",
    testimonial: "People ask if I'm using a filter!",
    service: "skin-rejuvenation",
    serviceName: "Glass Skin Facial",
    altText: "Glass skin facial results - luminous glowing complexion after 6 months of treatment Prairie Glow Beauty",
  },
  {
    id: 3,
    image: beforeAfter,
    title: "Texture Refined",
    description: "From dull to radiant in 75 minutes",
    testimonial: "I finally have clear, glowing skin.",
    service: "anti-aging",
    serviceName: "Anti-Aging Treatment",
    altText: "Before and after anti-aging treatment - refined skin texture and radiance Prairie Glow Beauty Niverville",
  },
  {
    id: 4,
    image: glassSkinPortrait,
    title: "Event Ready",
    description: "Pre-photoshoot treatment",
    testimonial: "Camera-ready confidence!",
    service: "laser-hair-removal",
    serviceName: "Laser Hair Removal",
    altText: "Event-ready skin after laser hair removal treatment - smooth confident results Prairie Glow Beauty Manitoba",
  },
];

const breadcrumbItems = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
];

const Gallery = () => {
  return (
    <Layout>
      <SEO
        title="Laser Hair Removal Results Niverville MB | Before & After Gallery | Prairie Glow"
        description="See real laser hair removal results from Prairie Glow Beauty clients in Niverville. Before and after photos showing painless, permanent hair removal."
        keywords="laser hair removal before after winnipeg, laser hair removal results niverville, prairie glow beauty gallery"
        canonical="/gallery"
      />
      {/* Hero */}
      <section className="pt-28 pb-8 bg-secondary/30">
        <div className="container">
          <Breadcrumb items={breadcrumbItems} /> {/* SEO schema only, no visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto lg:mx-0 text-center lg:text-left"
          >
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Real Results
            </span>
            <h1 className="font-serif text-5xl md:text-6xl font-semibold mt-3 mb-6">
              Before & After Gallery
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              See the incredible transformations our clients experience with our{" "}
              <Link to="/services/skin-rejuvenation" className="text-primary hover:underline">facial treatments</Link>,{" "}
              <Link to="/services/laser-hair-removal" className="text-primary hover:underline">laser hair removal</Link>, and{" "}
              <Link to="/services/anti-aging" className="text-primary hover:underline">anti-aging treatments</Link>.
              Real people, real results, real glow.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8">
            {galleryItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="relative rounded-3xl overflow-hidden shadow-card mb-4">
                  <img
                    src={item.image}
                    alt={item.altText}
                    className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform">
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 text-glow-gold fill-glow-gold" />
                      ))}
                    </div>
                    <p className="text-white italic">"{item.testimonial}"</p>
                  </div>
                </div>
                <h3 className="font-serif text-xl font-semibold mb-1">{item.title}</h3>
                <p className="text-muted-foreground mb-3">{item.description}</p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/services/${item.service}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Learn about {item.serviceName}
                  </Link>
                  <Link
                    to="/booking"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                  >
                    Book this treatment →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 glow-gradient">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="font-serif text-4xl md:text-5xl font-semibold mb-6">
              Ready for Your Transformation?
            </h2>
            <p className="text-xl text-muted-foreground mb-6">
              Join our gallery of happy clients. Experience professional{" "}
              <Link to="/services/laser-hair-removal" className="text-primary hover:underline">laser hair removal</Link>,{" "}
              <Link to="/services/skin-rejuvenation" className="text-primary hover:underline">skin rejuvenation</Link>, and{" "}
              <Link to="/services/anti-aging" className="text-primary hover:underline">anti-aging treatments</Link>{" "}
              in Niverville, MB.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button variant="hero" size="xl" asChild>
                <Link to="/booking">
                  Book Your Free Consultation
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/pricing">
                  View Pricing & Packages
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Questions? <Link to="/contact" className="text-primary hover:underline">Contact us</Link> or chat with our{" "}
              <Link to="/advisor" className="text-primary hover:underline">AI Beauty Advisor</Link>.
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Gallery;
