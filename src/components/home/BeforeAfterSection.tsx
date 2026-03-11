import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import combinedBefore from "@/assets/combined-before.jpg";
import combinedAfter from "@/assets/combined-after.jpg";

export function BeforeAfterSection() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <section className="py-24">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Real Results
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold mt-3 mb-6">
            See the Transformation
          </h2>
          <p className="text-muted-foreground text-lg">
            Our clients experience visible improvements in skin clarity, texture, and
            luminosity after just one session. Drag to compare.
          </p>
        </motion.div>

        {/* Single Unified Slider */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div
            ref={containerRef}
            className="relative rounded-2xl overflow-hidden shadow-2xl cursor-ew-resize select-none"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchStart={() => isDragging.current = true}
            onTouchEnd={() => isDragging.current = false}
          >
            {/* Aspect Ratio Container - 16:9 for wide two-person composition */}
            <div className="relative aspect-[16/9]">
              {/* Before Image (base layer) */}
              <img
                src={combinedBefore}
                alt="Before laser treatment - skin texture and tone before Prairie Glow Beauty services"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />

              {/* After Image (clipped layer) */}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={combinedAfter}
                  alt="After laser treatment - smooth radiant skin results at Prairie Glow Beauty Niverville MB"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>

              {/* Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-lg pointer-events-none"
                style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
              >
                {/* Drag Handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center">
                  <div className="flex gap-1">
                    <div className="w-0.5 h-4 bg-primary rounded-full" />
                    <div className="w-0.5 h-4 bg-primary rounded-full" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Drag the slider to reveal the transformation
        </p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button variant="outline" size="lg" asChild>
            <Link to="/gallery">
              View Full Gallery
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
