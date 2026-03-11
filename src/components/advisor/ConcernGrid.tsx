import { motion } from "framer-motion";
import { 
  Sparkles, 
  Droplets, 
  Sun, 
  Heart, 
  Scissors, 
  Zap,
  ArrowRight 
} from "lucide-react";

interface ConcernGridProps {
  onConcernClick: (concern: string) => void;
}

const concerns = [
  {
    id: "unwanted_hair",
    title: "Unwanted Hair",
    description: "Laser hair removal for smooth, hair-free skin",
    icon: Scissors,
    color: "from-rose-500/20 to-pink-500/20",
    borderColor: "hover:border-rose-500/50",
  },
  {
    id: "aging_skin",
    title: "Aging Skin",
    description: "Photo facials, microneedling & more",
    icon: Sparkles,
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "hover:border-amber-500/50",
  },
  {
    id: "acne_scars",
    title: "Acne & Scars",
    description: "Targeted treatments for clearer skin",
    icon: Droplets,
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "hover:border-blue-500/50",
  },
  {
    id: "sun_damage",
    title: "Sun Damage",
    description: "Reverse dark spots & hyperpigmentation",
    icon: Sun,
    color: "from-yellow-500/20 to-amber-500/20",
    borderColor: "hover:border-yellow-500/50",
  },
  {
    id: "dull_skin",
    title: "Dull Skin",
    description: "Revitalize with our signature facials",
    icon: Zap,
    color: "from-purple-500/20 to-violet-500/20",
    borderColor: "hover:border-purple-500/50",
  },
  {
    id: "special_occasion",
    title: "Special Occasion",
    description: "Look your best for your big day",
    icon: Heart,
    color: "from-pink-500/20 to-rose-500/20",
    borderColor: "hover:border-pink-500/50",
  },
];

export function ConcernGrid({ onConcernClick }: ConcernGridProps) {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">What concerns you most?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select a concern to get personalized treatment recommendations from our AI advisor.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {concerns.map((concern, index) => (
            <motion.button
              key={concern.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onConcernClick(concern.id)}
              className={`group relative p-6 rounded-2xl border bg-card text-left transition-all ${concern.borderColor} hover:shadow-lg`}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${concern.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <concern.icon className="h-6 w-6 text-primary" />
                </div>
                
                <h3 className="font-semibold text-lg mb-2">{concern.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {concern.description}
                </p>
                
                <div className="flex items-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Get recommendations
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
