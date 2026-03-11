import { useState } from "react";
import {
  BookOpen,
  Copy,
  Check,
  Code,
  Server,
  Shield,
  Users,
  ShoppingCart,
  Calendar,
  GraduationCap,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  description?: string;
  auth: boolean;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
}

interface APISection {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  endpoints: Endpoint[];
}

const apiSections: APISection[] = [
  {
    id: "auth",
    name: "Authentication",
    icon: Shield,
    description: "Session management and user authentication",
    endpoints: [
      {
        method: "POST",
        path: "/v1/auth/session/exchange",
        summary: "Exchange credentials for session token",
        auth: false,
        requestBody: {
          email: "string",
          displayName: "string (optional)",
        },
        responseBody: {
          access_token: "string",
          actor: {
            userId: "string",
            email: "string",
            roles: ["string"],
          },
        },
      },
      {
        method: "GET",
        path: "/v1/auth/me",
        summary: "Get current user info",
        auth: true,
        responseBody: {
          userId: "string",
          email: "string",
          roles: ["string"],
          locationScopes: ["string"],
        },
      },
    ],
  },
  {
    id: "catalog",
    name: "Catalog",
    icon: ShoppingCart,
    description: "Services, products, and packages",
    endpoints: [
      {
        method: "GET",
        path: "/v1/public/locations/:locationSlug/catalog/services",
        summary: "List available services",
        auth: false,
        responseBody: {
          services: [
            {
              slug: "string",
              name: "string",
              description: "string",
              durationMinutes: "number",
              pricing: {
                amountCents: "number",
                currency: "string",
              },
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/v1/public/locations/:locationSlug/catalog/products",
        summary: "List available products",
        auth: false,
      },
    ],
  },
  {
    id: "bookings",
    name: "Bookings",
    icon: Calendar,
    description: "Appointment scheduling and management",
    endpoints: [
      {
        method: "POST",
        path: "/v1/public/availability/search",
        summary: "Search available time slots",
        auth: false,
        requestBody: {
          locationSlug: "string",
          serviceSlug: "string",
          providerSlug: "string (optional)",
          fromDate: "string (ISO 8601)",
          toDate: "string (ISO 8601)",
        },
      },
      {
        method: "POST",
        path: "/v1/public/bookings",
        summary: "Create a new booking",
        auth: true,
        requestBody: {
          locationSlug: "string",
          serviceSlug: "string",
          providerSlug: "string",
          slotId: "string",
          customer: {
            email: "string",
            phone: "string",
            name: "string",
          },
        },
      },
    ],
  },
  {
    id: "customers",
    name: "Customers",
    icon: Users,
    description: "Customer management and CRM",
    endpoints: [
      {
        method: "GET",
        path: "/v1/me/profile",
        summary: "Get customer profile",
        auth: true,
      },
      {
        method: "PATCH",
        path: "/v1/me/profile",
        summary: "Update customer profile",
        auth: true,
      },
    ],
  },
  {
    id: "education",
    name: "Education",
    icon: GraduationCap,
    description: "Learning platform and courses",
    endpoints: [
      {
        method: "GET",
        path: "/v1/me/education/enrollments",
        summary: "List my enrollments",
        auth: true,
      },
      {
        method: "POST",
        path: "/v1/me/education/lessons/:lessonId/progress",
        summary: "Update lesson progress",
        auth: true,
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  POST: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  PUT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  PATCH: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function AdminAPIDocs() {
  const [activeSection, setActiveSection] = useState("auth");
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const toggleEndpoint = (endpointId: string) => {
    const newSet = new Set(expandedEndpoints);
    if (newSet.has(endpointId)) {
      newSet.delete(endpointId);
    } else {
      newSet.add(endpointId);
    }
    setExpandedEndpoints(newSet);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCurlExample = (endpoint: Endpoint) => {
    const baseUrl = "https://api.daysi.ca";
    const authHeader = endpoint.auth ? ' \\\n  -H "Authorization: Bearer YOUR_TOKEN"' : "";
    
    if (endpoint.method === "GET") {
      return `curl -X ${endpoint.method} \\\n  "${baseUrl}${endpoint.path}"${authHeader}`;
    }
    
    return `curl -X ${endpoint.method} \\\n  "${baseUrl}${endpoint.path}" \\\n  -H "Content-Type: application/json"${authHeader} \\\n  -d '${JSON.stringify(endpoint.requestBody || {}, null, 2)}'`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Reference for the Daysi Platform API
          </p>
        </div>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Download OpenAPI Spec
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Sections</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {apiSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{section.name}</span>
                    <Badge variant={activeSection === section.id ? "secondary" : "outline"} className="ml-auto">
                      {section.endpoints.length}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {apiSections
            .filter((s) => s.id === activeSection)
            .map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.id} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>{section.name}</CardTitle>
                          <CardDescription>{section.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  <div className="space-y-4">
                    {section.endpoints.map((endpoint, index) => {
                      const endpointId = `${section.id}-${index}`;
                      const isExpanded = expandedEndpoints.has(endpointId);
                      
                      return (
                        <Card key={endpointId} className="overflow-hidden">
                          <button
                            onClick={() => toggleEndpoint(endpointId)}
                            className="w-full"
                          >
                            <CardHeader className="flex flex-row items-center gap-4 py-4">
                              <Badge className={methodColors[endpoint.method]}>
                                {endpoint.method}
                              </Badge>
                              <code className="flex-1 text-sm text-left">{endpoint.path}</code>
                              {endpoint.auth && (
                                <Badge variant="outline">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Auth
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </CardHeader>
                          </button>
                          
                          {isExpanded && (
                            <CardContent className="border-t bg-muted/50">
                              <div className="space-y-6">
                                <div>
                                  <h4 className="font-medium mb-2">{endpoint.summary}</h4>
                                  {endpoint.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {endpoint.description}
                                    </p>
                                  )}
                                </div>

                                <Tabs defaultValue="curl">
                                  <TabsList>
                                    <TabsTrigger value="curl">cURL</TabsTrigger>
                                    <TabsTrigger value="request">Request</TabsTrigger>
                                    <TabsTrigger value="response">Response</TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="curl" className="mt-4">
                                    <div className="relative">
                                      <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                                        <code>{getCurlExample(endpoint)}</code>
                                      </pre>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(getCurlExample(endpoint), endpointId)}
                                      >
                                        {copiedCode === endpointId ? (
                                          <Check className="h-4 w-4" />
                                        ) : (
                                          <Copy className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="request" className="mt-4">
                                    {endpoint.requestBody ? (
                                      <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                                        <code>{JSON.stringify(endpoint.requestBody, null, 2)}</code>
                                      </pre>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        No request body required
                                      </p>
                                    )}
                                  </TabsContent>
                                  
                                  <TabsContent value="response" className="mt-4">
                                    {endpoint.responseBody ? (
                                      <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                                        <code>{JSON.stringify(endpoint.responseBody, null, 2)}</code>
                                      </pre>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        Response structure not documented
                                      </p>
                                    )}
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
