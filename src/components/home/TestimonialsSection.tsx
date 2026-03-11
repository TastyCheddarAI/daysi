import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Sarah M.",
    role: "Bride-to-be",
    content: "I got the Glass Facial a week before my wedding and my skin looked absolutely FLAWLESS in all my photos. My makeup artist was amazed at how smooth my skin was. Worth every penny!",
    rating: 5,
  },
  {
    id: 2,
    name: "Jessica L.",
    role: "Monthly Client",
    content: "I've been getting this facial monthly for 6 months now. The difference in my skin is incredible, smooth texture, no dullness. People keep asking if I use a filter in photos!",
    rating: 5,
  },
  {
    id: 3,
    name: "Amanda K.",
    role: "First-time Client",
    content: "I was skeptical about the 'glass skin' claim but WOW. The glow lasted for over a week! Already booked my next appointment. The team is so professional and the space is beautiful.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 glow-gradient">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Client Love
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold mt-3 mb-6">
            What Our Clients Say
          </h2>
          <p className="text-muted-foreground text-lg">
            Don't just take our word for it. Hear from real clients who've
            experienced the Glass Facial transformation.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="bg-white rounded-3xl p-8 shadow-card relative"
            >
              {/* Quote Icon */}
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-glow">
                <Quote className="w-6 h-6 text-primary-foreground" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-glow-gold fill-glow-gold" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground leading-relaxed mb-6">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-glow-blush to-glow-rose" />
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
