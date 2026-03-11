import { useState } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Edit3,
  GraduationCap,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { SEO } from "@/components/SEO";
import { AiWorkbenchDialog } from "@/components/admin/education/AiWorkbenchDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-states";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loading-states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDaysiAdminEducationModules,
  useDeleteDaysiAdminEducationModule,
  useGenerateDaysiAdminModuleContent,
  usePublishDaysiAdminEducationModule,
} from "@/hooks/useDaysiAdminEducationModules";
import type {
  DaysiAdminEducationModule,
  EducationModuleCategory,
  EducationModuleDifficulty,
  GenerateModuleContentInput,
} from "@/lib/daysi-education-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

const categoryLabels: Record<EducationModuleCategory, string> = {
  foundations: "Foundations",
  technical: "Technical Skills",
  business: "Business Operations",
  safety: "Safety & Compliance",
  consulting: "Consulting",
  marketing: "Marketing",
  client_care: "Client Care",
  advanced: "Advanced Techniques",
  certification: "Certification",
};

const difficultyColors: Record<EducationModuleDifficulty, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-blue-100 text-blue-800",
  advanced: "bg-orange-100 text-orange-800",
  expert: "bg-purple-100 text-purple-800",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  in_review: "bg-yellow-100 text-yellow-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-red-100 text-red-800",
};

export default function AdminEducationModules() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [aiWorkbenchOpen, setAiWorkbenchOpen] = useState(false);

  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const { modules, stats, isLoading, isFetching, error, refetch } = useDaysiAdminEducationModules({
    locationSlug,
    search: searchQuery,
  });

  const generateContent = useGenerateDaysiAdminModuleContent();
  const publishModule = usePublishDaysiAdminEducationModule();
  const deleteModule = useDeleteDaysiAdminEducationModule();

  const filteredModules = modules.filter((module) => {
    if (categoryFilter !== "all" && module.category !== categoryFilter) return false;
    if (statusFilter !== "all" && module.status !== statusFilter) return false;
    return true;
  });

  const handleGenerateContent = async (input: GenerateModuleContentInput) => {
    try {
      await generateContent.mutateAsync({
        ...input,
        locationSlug,
      });
      setAiWorkbenchOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handlePublish = async (slug: string) => {
    try {
      await publishModule.mutateAsync({ locationSlug, slug });
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this module? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteModule.mutateAsync({ locationSlug, slug });
    } catch {
      // Error handled by mutation
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <SEO
          title="Education Modules | Admin"
          description="Manage Daysi education modules"
          keywords="daysi, admin, education, modules, ai"
        />
        <div>
          <h1 className="text-2xl font-bold">Education Modules</h1>
          <p className="text-muted-foreground">Create and manage AI-powered educational content</p>
        </div>
        <EmptyState
          title="Failed to load modules"
          description="The education modules could not be loaded."
          action={{ label: "Retry", onClick: refetch }}
        />
      </div>
    );
  }

  if (isLoading) {
    return <PageLoader message="Loading education modules..." />;
  }

  return (
    <>
      <SEO
        title="Education Modules | Admin"
        description="Manage Daysi education modules with AI-powered content generation"
        keywords="daysi, admin, education, modules, ai"
      />

      <div className="space-y-6 min-w-0 max-w-full">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-2xl font-bold">
              <BookOpen className="h-6 w-6" />
              Education Modules
            </h1>
            <p className="text-muted-foreground">
              Create and manage AI-powered educational content for your team
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setAiWorkbenchOpen(true)}
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              AI Workbench
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Module
            </Button>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalModules ?? 0}</div>
              <p className="text-xs text-muted-foreground">Education modules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.publishedModules ?? 0}</div>
              <p className="text-xs text-muted-foreground">Live modules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.aiGeneratedModules ?? 0}</div>
              <p className="text-xs text-muted-foreground">Using AI assistance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLessons ?? 0}</div>
              <p className="text-xs text-muted-foreground">Across all modules</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredModules.length === 0 ? (
          <EmptyState
            title="No modules found"
            description={
              searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first module with AI"
            }
            action={
              !searchQuery && categoryFilter === "all" && statusFilter === "all"
                ? {
                    label: "Open AI Workbench",
                    onClick: () => setAiWorkbenchOpen(true),
                  }
                : undefined
            }
          />
        ) : viewMode === "list" ? (
          <ModulesTable
            modules={filteredModules}
            onPublish={handlePublish}
            onDelete={handleDelete}
            isPublishing={publishModule.isPending}
            isDeleting={deleteModule.isPending}
          />
        ) : (
          <ModulesGrid
            modules={filteredModules}
            onPublish={handlePublish}
            onDelete={handleDelete}
            isPublishing={publishModule.isPending}
            isDeleting={deleteModule.isPending}
          />
        )}
      </div>

      <AiWorkbenchDialog
        open={aiWorkbenchOpen}
        onOpenChange={setAiWorkbenchOpen}
        onSubmit={handleGenerateContent}
        isLoading={generateContent.isPending}
      />
    </>
  );
}

function ModulesTable({
  modules,
  onPublish,
  onDelete,
  isPublishing,
  isDeleting,
}: {
  modules: DaysiAdminEducationModule[];
  onPublish: (slug: string) => void;
  onDelete: (slug: string) => void;
  isPublishing: boolean;
  isDeleting: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Lessons</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.slug}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{module.title}</span>
                      {module.aiGenerated && (
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {module.shortDescription}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{categoryLabels[module.category]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={difficultyColors[module.difficulty]}>
                    {module.difficulty}
                  </Badge>
                </TableCell>
                <TableCell>{module.lessonCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {Math.round(module.estimatedDurationMinutes / 60)}h{" "}
                    {module.estimatedDurationMinutes % 60}m
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[module.status]}>{module.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {module.status === "draft" && (
                        <DropdownMenuItem
                          onClick={() => onPublish(module.slug)}
                          disabled={isPublishing}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Publish
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(module.slug)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ModulesGrid({
  modules,
  onPublish,
  onDelete,
  isPublishing,
  isDeleting,
}: {
  modules: DaysiAdminEducationModule[];
  onPublish: (slug: string) => void;
  onDelete: (slug: string) => void;
  isPublishing: boolean;
  isDeleting: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((module) => (
        <Card key={module.slug} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold leading-none">{module.title}</h3>
                  {module.aiGenerated && (
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {module.shortDescription}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {module.status === "draft" && (
                    <DropdownMenuItem
                      onClick={() => onPublish(module.slug)}
                      disabled={isPublishing}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Publish
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(module.slug)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">{categoryLabels[module.category]}</Badge>
              <Badge className={difficultyColors[module.difficulty]}>
                {module.difficulty}
              </Badge>
              <Badge className={statusColors[module.status]}>{module.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span>{module.lessonCount} lessons</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {Math.round(module.estimatedDurationMinutes / 60)}h{" "}
                  {module.estimatedDurationMinutes % 60}m
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
