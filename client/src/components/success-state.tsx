import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapProject } from "@/types/map";
import { calculateGridLayout } from "@/lib/pdf-generator";
import { Check, Download, Plus, Eye, FileText } from "lucide-react";

interface SuccessStateProps {
  project: MapProject;
  onStartNew: () => void;
  onPreview: () => void;
}

export default function SuccessState({ project, onStartNew, onPreview }: SuccessStateProps) {
  // Calculate actual page count and file info
  const getFileInfo = () => {
    const imageWidth = project.imageWidth;
    const imageHeight = project.imageHeight;
    
    const gridLayout = calculateGridLayout(
      imageWidth,
      imageHeight,
      project.scale,
      project.settings.paperSize
    );
    
    let totalPages = gridLayout.totalPages;
    
    // Add backside pages if enabled
    if (project.settings.generateBacksideNumbers) {
      totalPages += gridLayout.totalPages;
    }
    
    // Add assembly guide page
    totalPages += 1;
    
    // Estimate file size (rough calculation)
    const estimatedSizeMB = Math.round((totalPages * 0.5) * 10) / 10; // ~0.5MB per page
    
    return {
      pageCount: totalPages,
      fileSize: `${estimatedSizeMB} MB`
    };
  };

  const fileInfo = getFileInfo();

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/maps/${project.id}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.fileName.replace(/\.[^/.]+$/, "")}_printable.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="text-2xl text-green-600 h-8 w-8" />
        </div>
        
        <h2 className="text-xl font-semibold mb-2" data-testid="text-success-title">
          PDF Generated Successfully!
        </h2>
        
        <p className="text-muted-foreground mb-6" data-testid="text-success-description">
          Your map has been processed and is ready for download.
        </p>
        
        <Card className="mb-6" data-testid="card-download-info">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <FileText className="text-red-500 h-6 w-6" />
                <div className="text-left">
                  <p className="font-medium" data-testid="text-file-name">
                    {project.fileName.replace(/\.[^/.]+$/, "")}_printable.pdf
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-file-info">
                    {fileInfo.pageCount} pages • {fileInfo.fileSize}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleDownload}
                data-testid="button-download-pdf"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            <div className="text-xs text-muted-foreground" data-testid="text-pdf-features">
              <span className="inline-flex items-center">
                <span className="w-1 h-1 bg-muted-foreground rounded-full mr-1"></span>
                Includes assembly guide and optional backside numbering for double-sided printing
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center space-x-3">
          <Button 
            variant="secondary"
            onClick={onStartNew}
            data-testid="button-process-another"
          >
            <Plus className="mr-2 h-4 w-4" />
            Process Another Map
          </Button>
          <Button 
            variant="outline"
            onClick={onPreview}
            data-testid="button-preview-pages"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Pages
          </Button>
        </div>
      </div>
    </div>
  );
}
