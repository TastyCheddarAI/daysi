import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, MessageCircle, Instagram, Facebook, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useChat } from "@/contexts/ChatContext";

const Contact = () => {
  const { data: settings } = useBusinessSettings();
  const { openChat } = useChat();

  // Build contact info from settings
  const city = settings?.city || "Niverville";
  const province = settings?.province || "Manitoba";
  const phone = settings?.phone || "(204) 555-1234";
  const email = settings?.email || "hello@laserhairremovalwinnipeg.ca";
  const instagramUrl = settings?.instagram_url || "https://instagram.com";
  const facebookUrl = settings?.facebook_url || "https://facebook.com";
  const hoursWeekday = settings?.hours_weekday || "Tue - Fri: 9am - 6pm";
  const hoursSaturday = settings?.hours_saturday || "Sat: 9am - 4pm";
  const hoursSunday = settings?.hours_sunday || "Sun - Mon: Closed";

  const contactInfo = [
    {
      icon: MapPin,
      title: "Visit Us",
      details: [`${city}, ${province}`, "Greater Winnipeg Area"],
    },
    {
      icon: Phone,
      title: "Call Us",
      details: [phone],
      link: `tel:${phone.replace(/\D/g, "")}`,
    },
    {
      icon: Mail,
      title: "Email Us",
      details: [email],
      link: `mailto:${email}`,
    },
    {
      icon: Clock,
      title: "Hours",
      details: [hoursWeekday, hoursSaturday, hoursSunday],
    },
  ];

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <Layout>
      <SEO
        title="Contact Prairie Glow Beauty | Laser Hair Removal Niverville MB"
        description="Contact Prairie Glow Beauty for painless laser hair removal in Niverville, MB. Questions, booking inquiries, or directions - we're here to help."
        keywords="prairie glow beauty contact, laser hair removal niverville contact, winnipeg laser hair removal inquiries"
        canonical="/contact"
      />
      {/* Hero */}
      <section className="pt-24 pb-6 bg-secondary/30">
        <div className="container">
          <Breadcrumb items={breadcrumbItems} /> {/* SEO schema only, no visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto lg:mx-0 text-center lg:text-left"
          >
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Get in Touch
            </span>
            <h1 className="font-serif text-5xl md:text-6xl font-semibold mt-3 mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Have questions about our{" "}
              <Link to="/services/laser-hair-removal" className="text-primary hover:underline">laser hair removal</Link>,{" "}
              <Link to="/services/skin-rejuvenation" className="text-primary hover:underline">facials</Link>, or{" "}
              <Link to="/services/anti-aging" className="text-primary hover:underline">anti-aging treatments</Link>?
              Ready to book? We'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="pt-12 pb-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {contactInfo.map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    {item.details.map((detail, i) => (
                      <p key={i} className="text-muted-foreground">
                        {item.link && i === 0 ? (
                          <a href={item.link} className="hover:text-primary transition-colors">
                            {detail}
                          </a>
                        ) : (
                          detail
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              ))}

              {/* Social Links */}
              <div className="pt-6">
                <h3 className="font-semibold mb-4">Follow Us</h3>
                <div className="flex gap-4">
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Chat CTA Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-card h-full flex flex-col justify-center">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <MessageCircle className="w-10 h-10 text-primary" />
                  </div>
                  
                  <div>
                    <h2 className="font-serif text-3xl font-semibold mb-3">
                      Chat with Our AI Advisor
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                      Get instant answers about treatments, pricing, and personalized recommendations, available 24/7.
                    </p>
                  </div>

                  <Button 
                    variant="hero" 
                    size="lg" 
                    onClick={() => openChat()}
                    className="w-full sm:w-auto"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Start a Conversation
                  </Button>

                  <p className="text-sm text-muted-foreground">
                    Or reach us directly via phone or email
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="outline" size="lg" asChild>
                      <a href={`tel:${phone.replace(/\D/g, "")}`}>
                        <Phone className="w-4 h-4" />
                        Call Us
                      </a>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <a href={`mailto:${email}`}>
                        <Mail className="w-4 h-4" />
                        Email Us
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Links Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 p-8 bg-secondary/50 rounded-3xl"
          >
            <h2 className="font-serif text-2xl font-semibold mb-6 text-center">
              Explore Our Services
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link 
                to="/services/laser-hair-removal" 
                className="flex items-center gap-2 p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <span className="font-medium">Laser Hair Removal</span>
                <ArrowRight className="w-4 h-4 ml-auto text-primary" />
              </Link>
              <Link 
                to="/services/skin-rejuvenation" 
                className="flex items-center gap-2 p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <span className="font-medium">Skin Rejuvenation</span>
                <ArrowRight className="w-4 h-4 ml-auto text-primary" />
              </Link>
              <Link 
                to="/services/anti-aging" 
                className="flex items-center gap-2 p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <span className="font-medium">Anti-Aging</span>
                <ArrowRight className="w-4 h-4 ml-auto text-primary" />
              </Link>
              <Link 
                to="/advisor" 
                className="flex items-center gap-2 p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <span className="font-medium">AI Beauty Advisor</span>
                <ArrowRight className="w-4 h-4 ml-auto text-primary" />
              </Link>
            </div>
            <p className="text-center text-muted-foreground mt-6">
              <Link to="/pricing" className="text-primary hover:underline">View all pricing and packages</Link>
              {" · "}
              <Link to="/gallery" className="text-primary hover:underline">See before & after results</Link>
              {" · "}
              <Link to="/booking" className="text-primary hover:underline">Book online now</Link>
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
