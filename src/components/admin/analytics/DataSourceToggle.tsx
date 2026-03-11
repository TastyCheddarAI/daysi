import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, BarChart3 } from "lucide-react";

export type DataSource = "first-party" | "google";

interface DataSourceToggleProps {
  value: DataSource;
  onChange: (value: DataSource) => void;
  disabled?: boolean;
}

export function DataSourceToggle({ value, onChange, disabled }: DataSourceToggleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Tabs
        value={value}
        onValueChange={(v) => onChange(v as DataSource)}
        className="w-auto"
      >
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger
            value="first-party"
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs px-3"
          >
            <Database className="h-3.5 w-3.5" />
            First-Party
          </TabsTrigger>
          <TabsTrigger
            value="google"
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs px-3"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Google
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </motion.div>
  );
}
