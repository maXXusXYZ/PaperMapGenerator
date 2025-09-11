import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapProject, CalibrationData } from "@/types/map";
import { Crosshair, X, RotateCw, RotateCcw } from "lucide-react";

interface CalibrationCanvasProps {
  project: MapProject;
  onCalibrationComplete: (project: MapProject) => void;
  onCancel: () => void;
}

export default function CalibrationCanvas({ 
  project, 
  onCalibrationComplete, 
  onCancel 
}: CalibrationCanvasProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [scale, setScale] = useState(project.scale);
  const [offsetX, setOffsetX] = useState(project.offsetX);
  const [offsetY, setOffsetY] = useState(project.offsetY);
  const [rotation, setRotation] = useState(project.rotation || 0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cursorGuide, setCursorGuide] = useState({ x: 0, y: 0, visible: false });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  const calibrationMutation = useMutation({
    mutationFn: async (data: CalibrationData) => {
      const response = await fetch(`/api/maps/${project.id}/calibration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save calibration');
      }

      return response.json();
    },
    onSuccess: (updatedProject) => {
      toast({
        title: "Calibration saved",
        description: "Map scale has been calibrated successfully.",
      });
      onCalibrationComplete(updatedProject);
    },
    onError: (error) => {
      toast({
        title: "Calibration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    const newZoom = Math.max(10, Math.min(500, zoomLevel + delta));
    setZoomLevel(newZoom);
    setScale(newZoom / 100);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { // Right click
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - offsetX,
        y: e.clientY - offsetY
      });
    } else if (e.button === 0) { // Left click - confirm scale
      handleConfirmScale();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCursorGuide({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true
      });
    }

    if (isDragging) {
      setOffsetX(e.clientX - dragStart.x);
      setOffsetY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) {
      setIsDragging(false);
    }
  };

  const handleMouseLeave = () => {
    setCursorGuide(prev => ({ ...prev, visible: false }));
    setIsDragging(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleConfirmScale = () => {
    calibrationMutation.mutate({
      scale,
      offsetX,
      offsetY,
      rotation
    });
  };

  const handleRotate = (degrees: number) => {
    setRotation(prev => (prev + degrees) % 360);
  };

  const imageStyle = {
    transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: 'center',
  };

  const cursorGuideStyle = {
    left: cursorGuide.x - 20,
    top: cursorGuide.y - 20,
    display: cursorGuide.visible ? 'block' : 'none',
  };

  return (
    <div className="h-full">
      {/* Instructions Banner */}
      <div className={`absolute top-0 left-0 right-0 p-4 z-40 ${project.status === 'calibrated' ? 'bg-green-600' : 'bg-primary'} text-primary-foreground`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Crosshair className="h-5 w-5" />
            <div>
              <p className="font-medium" data-testid="text-calibration-title">
                {project.status === 'calibrated' ? '✓ Calibration Complete' : 'Scale Calibration'}
              </p>
              <p className="text-sm opacity-90" data-testid="text-calibration-instructions">
                {project.status === 'calibrated' 
                  ? 'Scale saved! Click "Generate PDF" in the header to create your printable map.'
                  : 'Use mouse wheel to zoom, right-click to pan. Align the blue guide with your map\'s grid, then left-click to confirm.'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm opacity-90" data-testid="text-zoom-level">
              Zoom: {zoomLevel}%
            </span>
            <span className="text-sm opacity-90" data-testid="text-rotation-level">
              Rotation: {rotation}°
            </span>
            <div className="flex space-x-1">
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => handleRotate(-90)}
                className="bg-primary-foreground/20 hover:bg-primary-foreground/30"
                data-testid="button-rotate-left"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => handleRotate(90)}
                className="bg-primary-foreground/20 hover:bg-primary-foreground/30"
                data-testid="button-rotate-right"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              variant="secondary"
              size="sm"
              onClick={onCancel}
              className="bg-primary-foreground/20 hover:bg-primary-foreground/30"
              data-testid="button-cancel-calibration"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="h-full pt-20 relative overflow-hidden">
        <div 
          ref={containerRef}
          className={`h-full relative ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          data-testid="calibration-canvas"
        >
          <img 
            ref={imageRef}
            src={project.originalImageUrl}
            alt="Map being calibrated"
            className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
            style={imageStyle}
            data-testid="calibration-map-image"
          />
          
          {/* Cursor Guide Overlay */}
          <div 
            className="absolute pointer-events-none border-2 border-dashed border-primary bg-primary/10 w-10 h-10 z-10 rounded"
            style={cursorGuideStyle}
            data-testid="cursor-guide"
          />
        </div>
      </div>
    </div>
  );
}
