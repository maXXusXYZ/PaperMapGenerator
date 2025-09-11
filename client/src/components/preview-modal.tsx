import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapProject } from "@/types/map";
import { X, Map } from "lucide-react";

interface PreviewModalProps {
  project: MapProject;
  onClose: () => void;
}

export default function PreviewModal({ project, onClose }: PreviewModalProps) {
  // Generate mock page previews based on project settings
  const generatePreviewPages = () => {
    const pages = [];
    const pageCount = 24; // This would be calculated based on actual map dimensions
    
    for (let i = 1; i <= pageCount; i++) {
      pages.push({
        id: i,
        type: 'map',
        pageNumber: i
      });
      
      // Add backside numbering pages if enabled
      if (project.settings.generateBacksideNumbers && i < pageCount) {
        pages.push({
          id: `${i}-back`,
          type: 'backside',
          pageNumber: i
        });
      }
    }
    
    // Add assembly guide as final page
    pages.push({
      id: 'assembly',
      type: 'assembly',
      pageNumber: pages.length + 1
    });
    
    return pages;
  };

  const pages = generatePreviewPages();

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span data-testid="text-preview-title">Page Preview</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              data-testid="button-close-preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh] p-2" data-testid="preview-pages-container">
          <div className="grid grid-cols-4 gap-4">
            {pages.slice(0, 16).map((page) => (
              <div 
                key={page.id}
                className="bg-muted aspect-[8.5/11] rounded border-2 border-dashed border-border p-2 text-center flex items-center justify-center"
                data-testid={`preview-page-${page.id}`}
              >
                <div className="text-sm text-muted-foreground">
                  {page.type === 'map' && (
                    <>
                      <Map className="block mb-2 text-lg h-5 w-5 mx-auto" />
                      <span data-testid={`text-page-${page.id}`}>Page {page.pageNumber}</span>
                    </>
                  )}
                  {page.type === 'backside' && (
                    <>
                      <div className="text-2xl font-bold mb-1">{page.pageNumber}</div>
                      <span className="text-xs" data-testid={`text-backside-${page.id}`}>Backside</span>
                    </>
                  )}
                  {page.type === 'assembly' && (
                    <>
                      <div className="text-xs mb-1">Assembly</div>
                      <span className="text-xs" data-testid="text-assembly-guide">Guide</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {pages.length > 16 && (
            <div className="mt-4 text-center text-sm text-muted-foreground" data-testid="text-more-pages">
              ... and {pages.length - 16} more pages
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
