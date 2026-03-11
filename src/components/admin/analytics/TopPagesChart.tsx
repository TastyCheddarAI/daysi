import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TopPagesChartProps {
  topPages: Array<{ path: string; views: number }>;
  entryPages: Array<{ path: string; entries: number; bounceRate: number }>;
  exitPages: Array<{ path: string; exits: number }>;
}

export function TopPagesChart({ topPages, entryPages, exitPages }: TopPagesChartProps) {
  const formatPath = (path: string) => {
    if (path === "/") return "Home";
    return path.length > 20 ? path.slice(0, 20) + "..." : path;
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0] as { payload: { path: string; views?: number; entries?: number; exits?: number; bounceRate?: number } };
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-1">{data.payload.path}</p>
          {data.payload.views !== undefined && (
            <p className="text-sm text-muted-foreground">Views: {data.payload.views.toLocaleString()}</p>
          )}
          {data.payload.entries !== undefined && (
            <>
              <p className="text-sm text-muted-foreground">Entries: {data.payload.entries.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Bounce Rate: {data.payload.bounceRate?.toFixed(1)}%</p>
            </>
          )}
          {data.payload.exits !== undefined && (
            <p className="text-sm text-muted-foreground">Exits: {data.payload.exits.toLocaleString()}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Performance</CardTitle>
        <CardDescription>Most visited pages on your site</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="top" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="top">Top Pages</TabsTrigger>
            <TabsTrigger value="entry">Entry Pages</TabsTrigger>
            <TabsTrigger value="exit">Exit Pages</TabsTrigger>
          </TabsList>

          <TabsContent value="top" className="h-[250px]">
            {topPages.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPages.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    type="category" 
                    dataKey="path" 
                    width={100}
                    className="text-xs"
                    tickFormatter={formatPath}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No page data available
              </div>
            )}
          </TabsContent>

          <TabsContent value="entry" className="h-[250px]">
            {entryPages.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entryPages.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    type="category" 
                    dataKey="path" 
                    width={100}
                    className="text-xs"
                    tickFormatter={formatPath}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="entries" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No entry page data available
              </div>
            )}
          </TabsContent>

          <TabsContent value="exit" className="h-[250px]">
            {exitPages.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exitPages.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    type="category" 
                    dataKey="path" 
                    width={100}
                    className="text-xs"
                    tickFormatter={formatPath}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="exits" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No exit page data available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
