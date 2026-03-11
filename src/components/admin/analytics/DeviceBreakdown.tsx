import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Smartphone, Monitor, Tablet } from "lucide-react";
import { motion } from "framer-motion";

interface DeviceBreakdownProps {
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
}

const COLORS = {
  mobile: "hsl(var(--primary))",
  desktop: "hsl(var(--chart-2))",
  tablet: "hsl(var(--chart-3))",
};

const ICONS = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: Tablet,
};

const LABELS = {
  mobile: "Mobile",
  desktop: "Desktop",
  tablet: "Tablet",
};

export function DeviceBreakdown({ devices }: DeviceBreakdownProps) {
  const total = devices.mobile + devices.desktop + devices.tablet;
  
  const data = Object.entries(devices)
    .map(([name, value]) => ({
      name: LABELS[name as keyof typeof LABELS],
      value,
      key: name,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .filter(d => d.value > 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Breakdown</CardTitle>
          <CardDescription>How visitors access your site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No device data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Breakdown</CardTitle>
        <CardDescription>How visitors access your site</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="w-[160px] h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry) => (
                    <Cell 
                      key={entry.key} 
                      fill={COLORS[entry.key as keyof typeof COLORS]} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [value.toLocaleString(), "Visitors"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-3">
            {data.map((item, index) => {
              const Icon = ICONS[item.key as keyof typeof ICONS];
              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${COLORS[item.key as keyof typeof COLORS]}20` }}
                  >
                    <Icon 
                      className="h-4 w-4" 
                      style={{ color: COLORS[item.key as keyof typeof COLORS] }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm font-bold">{item.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.value.toLocaleString()} visitors
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
