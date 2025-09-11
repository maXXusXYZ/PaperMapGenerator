import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { MapProject } from "@/types/map";
import { CloudUpload, Image, Info, Shield } from "lucide-react";

interface UploadZoneProps {
  onUploadComplete: (project: MapProject) => void;
}

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('mapImage', file);

      const response = await fetch('/api/maps/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json() as Promise<MapProject>;
    },
    onSuccess: (project) => {
      setUploadProgress(100);
      toast({
        title: "Upload successful",
        description: "Your map has been uploaded and is ready for calibration.",
      });
      onUploadComplete(project);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      uploadMutation.mutate(file);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.tiff', '.tif', '.bmp', '.webp', '.svg']
    },
    maxSize: 50 * 1024 * 1024, // Increased to 50MB for high-res images
    multiple: false
  });

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <CloudUpload className="text-6xl text-muted-foreground/50 mx-auto mb-4 h-16 w-16" />
          <h2 className="text-2xl font-semibold mb-2" data-testid="text-upload-title">
            Upload Your Map
          </h2>
          <p className="text-muted-foreground" data-testid="text-upload-description">
            Drag and drop your map image here, or click to browse
          </p>
        </div>
        
        <Card 
          {...getRootProps()}
          className={`border-2 border-dashed p-8 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          data-testid="upload-dropzone"
        >
          <input {...getInputProps()} data-testid="input-file" />
          <div className="flex flex-col items-center">
            <Image className="text-3xl text-muted-foreground mb-3 h-8 w-8" />
            <p className="text-sm font-medium mb-2" data-testid="text-drop-instruction">
              {isDragActive ? 'Drop the file here' : 'Choose file or drag it here'}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-file-types">
              PNG, JPG, GIF, TIFF, BMP, WebP, SVG up to 50MB
            </p>
          </div>
        </Card>

        {fileRejections.length > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md" data-testid="error-file-rejection">
            <p className="text-sm text-destructive">
              {fileRejections[0].errors[0].message}
            </p>
          </div>
        )}

        {uploadMutation.isPending && (
          <div className="mt-6" data-testid="upload-progress">
            <Progress value={uploadProgress} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        <div className="mt-6 text-xs text-muted-foreground space-y-2">
          <p data-testid="text-supported-formats">
            <Info className="inline mr-1 h-3 w-3" /> 
            Supported formats: PNG, JPG, GIF, TIFF, BMP, WebP, SVG
          </p>
          <p data-testid="text-privacy-notice">
            <Shield className="inline mr-1 h-3 w-3" /> 
            Your maps are processed locally and never stored
          </p>
        </div>
      </div>
    </div>
  );
}
