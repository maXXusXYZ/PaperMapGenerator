import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { MapProject } from "@/types/map";
import { useToast } from "@/hooks/use-toast";

interface ProcessingStateProps {
  project: MapProject;
  onProcessingComplete: (project: MapProject) => void;
}

export default function ProcessingState({ project, onProcessingComplete }: ProcessingStateProps) {
  const { toast } = useToast();

  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/maps/${project.id}/generate-pdf`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'PDF generation failed');
      }

      return response.json();
    },
    onSuccess: (updatedProject) => {
      toast({
        title: "PDF generated successfully",
        description: "Your map is ready for download.",
      });
      onProcessingComplete(updatedProject);
    },
    onError: (error) => {
      toast({
        title: "PDF generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Start PDF generation when component mounts
    generatePdfMutation.mutate();
  }, []);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-primary rounded-full animate-pulse" />
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        </div>
        
        <h2 className="text-xl font-semibold mb-2" data-testid="text-processing-title">
          Generating Your PDF
        </h2>
        
        <p className="text-muted-foreground mb-4" data-testid="text-processing-description">
          Processing map and creating printable pages...
        </p>
        
        <div className="w-64 mx-auto mb-2">
          <Progress value={65} className="h-2" data-testid="progress-generation" />
        </div>
        
        <p className="text-sm text-muted-foreground" data-testid="text-processing-step">
          Step 2 of 3: Slicing map into pages
        </p>
      </div>
    </div>
  );
}
