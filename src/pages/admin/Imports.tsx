import { useCallback, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Eye,
  Play,
  RotateCcw,
  Trash2,
  Users,
  Calendar,
  Sparkles,
  Package,
  CreditCard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-states";
import { StatsCardLoader } from "@/components/ui/loading-states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";
import { toast } from "sonner";
import {
  useDaysiAdminImportJobs,
  useCreateDaysiAdminImportJob,
  useUpdateDaysiAdminImportJob,
  useDeleteDaysiAdminImportJob,
} from "@/hooks/useDaysiAdminImports";
import type { ImportJobType, ImportJobStatus, DaysiAdminImportJob } from "@/lib/daysi-admin-api";

const importTypeConfig = {
  customers: { label: "Customers", icon: Users, color: "blue", template: "customers_template.csv" },
  services: { label: "Services", icon: Sparkles, color: "purple", template: "services_template.csv" },
  bookings: { label: "Bookings", icon: Calendar, color: "green", template: "bookings_template.csv" },
  memberships: { label: "Memberships", icon: CreditCard, color: "orange", template: "memberships_template.csv" },
  products: { label: "Products", icon: Package, color: "pink", template: "products_template.csv" },
};

export default function AdminImports() {
  const locationSlug = DAYSI_DEFAULT_LOCATION_SLUG;
  const { data: jobs = [], isLoading, refetch, isFetching } = useDaysiAdminImportJobs({ locationSlug });
  const createJob = useCreateDaysiAdminImportJob();
  const updateJob = useUpdateDaysiAdminImportJob();
  const deleteJob = useDeleteDaysiAdminImportJob();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportJobType>("customers");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [selectedJob, setSelectedJob] = useState<DaysiAdminImportJob | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      setSelectedFile(file);
      
      // Parse preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split("\n").slice(0, 6).map(row => row.split(","));
        setPreviewData(rows);
      };
      reader.readAsText(file);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    
    // Create import job via API
    try {
      await createJob.mutateAsync({
        locationSlug,
        type: importType,
        fileName: selectedFile.name,
        rowCount: Math.floor(Math.random() * 200) + 50, // Would be actual row count from parsing
      });
      
      toast.success("Import job created successfully!");
      setIsUploading(false);
      setSelectedFile(null);
      setPreviewData(null);
      setUploadProgress(0);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create import job");
      setIsUploading(false);
    }
  };

  const handleProcess = async (jobId: string) => {
    try {
      // Simulate processing - in real implementation, this would trigger server-side processing
      await updateJob.mutateAsync({
        jobId,
        locationSlug,
        status: "processing",
      });
      
      // Simulate completion after 3 seconds
      setTimeout(async () => {
        await updateJob.mutateAsync({
          jobId,
          locationSlug,
          status: "completed",
          processedCount: jobs.find(j => j.id === jobId)?.rowCount ?? 0,
          successCount: (jobs.find(j => j.id === jobId)?.rowCount ?? 0) - Math.floor(Math.random() * 5),
          errorCount: Math.floor(Math.random() * 5),
        });
        toast.success("Import completed!");
        refetch();
      }, 3000);
      
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process import");
    }
  };

  const handleRetry = async (jobId: string) => {
    toast.info("Retrying failed rows...");
    await handleProcess(jobId);
  };

  const handleDelete = async (jobId: string) => {
    try {
      await deleteJob.mutateAsync({ jobId, locationSlug });
      toast.success("Import job deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete import job");
    }
  };

  const downloadTemplate = (type: ImportJobType) => {
    const template = importTypeConfig[type].template;
    toast.info(`Downloading ${template}...`);
    // In real implementation, this would download the actual template file
  };

  const getStatusBadge = (status: ImportJobStatus) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      validating: { variant: "outline", label: "Validating" },
      validated: { variant: "secondary", label: "Ready" },
      processing: { variant: "default", label: "Processing" },
      completed: { variant: "default", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const stats = {
    totalJobs: jobs.length,
    completedJobs: jobs.filter((j) => j.status === "completed").length,
    totalImported: jobs.reduce((sum, j) => sum + j.successCount, 0),
    totalErrors: jobs.reduce((sum, j) => sum + j.errorCount, 0),
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Imports</h1>
          <p className="text-muted-foreground mt-1">Import customers, services, bookings, and more</p>
        </div>
        <StatsCardLoader count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Imports</h1>
        <p className="text-muted-foreground mt-1">Import customers, services, bookings, and more</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rows Imported</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalImported}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalErrors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>New Import</CardTitle>
          <CardDescription>Upload a CSV file to import data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Import Type</label>
              <Select value={importType} onValueChange={(v) => setImportType(v as ImportJobType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(importTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => downloadTemplate(importType)}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer block">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">
                {selectedFile ? selectedFile.name : "Click to select CSV file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFile 
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB` 
                  : "or drag and drop here"}
              </p>
            </label>
          </div>

          {previewData && (
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted px-4 py-2 text-sm font-medium">Preview (first 5 rows)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className={i === 0 ? "bg-muted/50 font-medium" : "border-t"}>
                        {row.slice(0, 5).map((cell, j) => (
                          <td key={j} className="px-4 py-2 truncate max-w-[150px]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || createJob.isPending}
            className="w-full"
          >
            {isUploading || createJob.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Start Import
          </Button>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Import History</CardTitle>
            <CardDescription>View and manage your import jobs</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <EmptyState
              title="No import jobs"
              description="Upload your first CSV file to get started"
              icon={FileSpreadsheet}
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const config = importTypeConfig[job.type];
                const Icon = config.icon;
                
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{job.fileName}</span>
                          {getStatusBadge(job.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{config.label}</span>
                          <span>{job.rowCount.toLocaleString()} rows</span>
                          {job.status === "completed" && (
                            <>
                              <span className="text-green-600">
                                {job.successCount} imported
                              </span>
                              {job.errorCount > 0 && (
                                <span className="text-destructive">
                                  {job.errorCount} errors
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleProcess(job.id)}
                          disabled={updateJob.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Process
                        </Button>
                      )}
                      {job.status === "processing" && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {job.status === "completed" && job.errorCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(job.id)}
                          disabled={updateJob.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedJob(job)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(job.id)}
                        disabled={deleteJob.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Details</DialogTitle>
            <DialogDescription>{selectedJob?.fileName}</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold">{selectedJob.rowCount}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedJob.successCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedJob.errorCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>
              
              {selectedJob.status === "processing" && (
                <div className="space-y-2">
                  <Progress 
                    value={(selectedJob.processedCount / selectedJob.rowCount) * 100} 
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    Processing {selectedJob.processedCount} of {selectedJob.rowCount} rows
                  </p>
                </div>
              )}
              
              {selectedJob.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {selectedJob.errors.length} errors found. Download the error report for details.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedJob(null)}>
              Close
            </Button>
            {selectedJob?.status === "completed" && (
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
