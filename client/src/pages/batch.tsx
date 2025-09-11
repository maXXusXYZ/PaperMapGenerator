import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Upload, PlayCircle, Download, Trash2, FileImage, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { MapSettings } from '@/types/map';
import type { BatchJob } from '@shared/schema';
import SettingsPanel from '@/components/settings-panel';
import Navigation from '@/components/navigation';

export default function BatchPage() {
  const [jobName, setJobName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batchSettings, setBatchSettings] = useState<MapSettings>({
    gridStyle: 'square',
    unitOfMeasurement: 'imperial',
    paperSize: 'a4',
    gridOverlay: false,
    backgroundColor: '#ffffff',
    averageBackgroundColor: false,
    gridMarkerColor: '#ffffff',
    guideColor: '#ffffff',
    generateBacksideNumbers: true,
    outlineStyle: 'dash',
    outlineThickness: 3,
    outlineColor: '#ffffff'
  });

  const { toast } = useToast();

  // Query to get all batch jobs
  const { data: batchJobs = [], isLoading: isLoadingJobs } = useQuery<BatchJob[]>({
    queryKey: ['/api/batch'],
    refetchInterval: 2000 // Poll every 2 seconds for updates
  });

  // Mutation to create batch job
  const createBatchMutation = useMutation({
    mutationFn: async ({ files, settings, name }: { files: File[], settings: MapSettings, name: string }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('mapImages', file));
      formData.append('settings', JSON.stringify(settings));
      formData.append('jobName', name);

      const response = await fetch('/api/batch', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create batch job');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/batch'] });
      setSelectedFiles([]);
      setJobName('');
      toast({
        title: "Batch job created",
        description: "Your batch processing job has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating batch job",
        description: error.message || "Failed to create batch job",
        variant: "destructive"
      });
    }
  });

  // Mutation to start batch processing
  const processBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const response = await fetch(`/api/batch/${batchId}/process`, { method: 'POST' });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start batch processing');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/batch'] });
      toast({
        title: "Batch processing started",
        description: "Your batch processing job has been started."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error starting batch processing",
        description: error.message || "Failed to start batch processing",
        variant: "destructive"
      });
    }
  });

  // Mutation to delete batch job
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const response = await fetch(`/api/batch/${batchId}`, { method: 'DELETE' });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete batch job');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/batch'] });
      toast({
        title: "Batch job deleted",
        description: "The batch job has been deleted successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting batch job",
        description: error.message || "Failed to delete batch job",
        variant: "destructive"
      });
    }
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.tiff', '.tif', '.bmp', '.webp', '.svg']
    },
    multiple: true,
    maxFiles: 20,
    maxSize: 50 * 1024 * 1024, // 50MB per file
    onDrop: (acceptedFiles) => {
      setSelectedFiles(acceptedFiles);
    },
    onDropRejected: (rejectedFiles) => {
      const errorMessages = rejectedFiles.map(file => 
        file.errors.map(error => error.message).join(', ')
      );
      toast({
        title: "File upload error",
        description: errorMessages.join('; '),
        variant: "destructive"
      });
    }
  });

  const handleCreateBatch = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image file to process.",
        variant: "destructive"
      });
      return;
    }

    if (!jobName.trim()) {
      toast({
        title: "Job name required",
        description: "Please enter a name for your batch job.",
        variant: "destructive"
      });
      return;
    }

    createBatchMutation.mutate({
      files: selectedFiles,
      settings: batchSettings,
      name: jobName.trim()
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'running':
        return <PlayCircle className="h-4 w-4 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-500';
      case 'running':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Batch Processing
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Process multiple map images at once with the same settings and download them as a batch.
          </p>
        </div>

        {/* Navigation */}
        <Navigation />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload and Settings Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload Maps</span>
                </CardTitle>
                <CardDescription>
                  Upload up to 20 map images for batch processing (max 50MB per file)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobName">Job Name</Label>
                    <Input
                      id="jobName"
                      data-testid="input-job-name"
                      placeholder="Enter a name for this batch job"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                    />
                  </div>

                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    data-testid="dropzone-batch-upload"
                  >
                    <input {...getInputProps()} />
                    <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    {selectedFiles.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedFiles.length} file(s) selected
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Click or drag to replace selection
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {isDragActive ? 'Drop files here' : 'Click or drag images here'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Supports PNG, JPG, TIFF, BMP, WebP, SVG
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Selected Files:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="truncate flex-1" data-testid={`text-file-${index}`}>
                              {file.name}
                            </span>
                            <span className="text-gray-500 ml-2">
                              {(file.size / 1024 / 1024).toFixed(1)}MB
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleCreateBatch}
                    disabled={selectedFiles.length === 0 || !jobName.trim() || createBatchMutation.isPending}
                    className="w-full"
                    data-testid="button-create-batch"
                  >
                    {createBatchMutation.isPending ? 'Creating...' : 'Create Batch Job'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Batch Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Batch Settings</CardTitle>
                <CardDescription>
                  These settings will be applied to all maps in the batch
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsPanel
                  project={null}
                  onSettingsUpdate={(settings) => setBatchSettings(settings)}
                  onReplaceMap={() => {}}
                  onResetMap={() => {}}
                  batchMode={true}
                  settings={batchSettings}
                />
              </CardContent>
            </Card>
          </div>

          {/* Batch Jobs List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Batch Jobs</CardTitle>
                <CardDescription>
                  Monitor your batch processing jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingJobs ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading batch jobs...</p>
                  </div>
                ) : batchJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No batch jobs yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {batchJobs.map((job: BatchJob) => (
                      <Card key={job.id} className="border-l-4" style={{ borderLeftColor: getStatusColor(job.status).replace('bg-', '#') }}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(job.status)}
                                <h4 className="font-medium text-sm" data-testid={`text-job-name-${job.id}`}>
                                  {job.name}
                                </h4>
                              </div>
                              <Badge variant="outline" className={getStatusColor(job.status).replace('bg-', 'border-')}>
                                {job.status}
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                <span>Progress</span>
                                <span data-testid={`text-progress-${job.id}`}>
                                  {job.processedFiles}/{job.totalFiles} files
                                </span>
                              </div>
                              <Progress 
                                value={(job.processedFiles / job.totalFiles) * 100} 
                                className="h-2"
                                data-testid={`progress-${job.id}`}
                              />
                              {job.failedFiles > 0 && (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  {job.failedFiles} failed
                                </p>
                              )}
                            </div>

                            <div className="flex space-x-2">
                              {job.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => processBatchMutation.mutate(job.id)}
                                  disabled={processBatchMutation.isPending}
                                  data-testid={`button-start-${job.id}`}
                                >
                                  <PlayCircle className="h-3 w-3 mr-1" />
                                  Start
                                </Button>
                              )}
                              
                              {job.status === 'completed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-testid={`button-download-${job.id}`}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteBatchMutation.mutate(job.id)}
                                disabled={deleteBatchMutation.isPending}
                                data-testid={`button-delete-${job.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>

                            {job.errorMessage && (
                              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                {job.errorMessage}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}