import { useState } from "react";
import { Card } from "@/components/ui/card";
import UploadZone from "@/components/upload-zone";
import SettingsPanel from "@/components/settings-panel";
import CalibrationCanvas from "@/components/calibration-canvas";
import ProcessingState from "@/components/processing-state";
import SuccessState from "@/components/success-state";
import PreviewModal from "@/components/preview-modal";
import Navigation from "@/components/navigation";
import { MapProject, MapSettings } from "@/types/map";
import { MapIcon, HelpCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSharedSettings } from "@/hooks/use-shared-settings";

type AppState = 'upload' | 'calibration' | 'processing' | 'success';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [currentProject, setCurrentProject] = useState<MapProject | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { settings: sharedSettings, updateSettings: updateSharedSettings } = useSharedSettings();

  const handleUploadComplete = (project: MapProject) => {
    // Initialize project with shared settings if available
    const projectWithSettings = {
      ...project,
      settings: { ...sharedSettings, ...project.settings }
    };
    setCurrentProject(projectWithSettings);
    setAppState('calibration');
  };

  const handleCalibrationComplete = (project: MapProject) => {
    setCurrentProject(project);
    // Stay in calibration state - user must manually trigger PDF generation
  };

  const handleProcessingComplete = (project: MapProject) => {
    setCurrentProject(project);
    setAppState('success');
  };

  const handleStartNew = () => {
    setCurrentProject(null);
    setAppState('upload');
  };

  const handleSettingsUpdate = (settings: MapSettings) => {
    // Update shared settings in localStorage for batch mode
    updateSharedSettings(settings);
    
    // Update current project settings
    if (currentProject) {
      setCurrentProject({
        ...currentProject,
        settings
      });
    }
  };

  const handleGeneratePDF = async () => {
    if (currentProject && currentProject.status === 'calibrated') {
      setAppState('processing');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <MapIcon className="text-primary text-xl h-6 w-6" />
            <h1 className="text-xl font-semibold">Paper Map Generator</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            Transform digital maps into printable, scalable PDFs
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            data-testid="button-help"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </Button>
          <Button 
            size="sm"
            disabled={!currentProject || appState !== 'calibration' || currentProject.status !== 'calibrated'}
            onClick={handleGeneratePDF}
            data-testid="button-generate-pdf"
          >
            <Download className="mr-2 h-4 w-4" />
            Generate PDF
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Settings Panel */}
        <aside className="w-80 bg-card border-r border-border overflow-y-auto">
          <SettingsPanel 
            project={currentProject}
            onSettingsUpdate={handleSettingsUpdate}
            onReplaceMap={handleStartNew}
            onResetMap={() => {
              if (currentProject) {
                setCurrentProject({
                  ...currentProject,
                  scale: 1,
                  offsetX: 0,
                  offsetY: 0,
                  rotation: 0
                });
              }
            }}
            batchMode={false}
            settings={currentProject?.settings || sharedSettings}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-muted relative overflow-hidden">
          {appState === 'upload' && (
            <UploadZone onUploadComplete={handleUploadComplete} />
          )}
          
          {appState === 'calibration' && currentProject && (
            <CalibrationCanvas 
              project={currentProject}
              onCalibrationComplete={handleCalibrationComplete}
              onCancel={handleStartNew}
            />
          )}
          
          {appState === 'processing' && currentProject && (
            <ProcessingState 
              project={currentProject}
              onProcessingComplete={handleProcessingComplete}
            />
          )}
          
          {appState === 'success' && currentProject && (
            <SuccessState 
              project={currentProject}
              onStartNew={handleStartNew}
              onPreview={() => setShowPreview(true)}
            />
          )}
        </main>
      </div>

      {/* Preview Modal */}
      {showPreview && currentProject && (
        <PreviewModal 
          project={currentProject}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
