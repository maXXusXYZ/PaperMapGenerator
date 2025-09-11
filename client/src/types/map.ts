export interface MapProject {
  id: string;
  fileName: string;
  originalImageUrl: string;
  imageWidth: number;
  imageHeight: number;
  settings: MapSettings;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  pdfUrl?: string;
  status: 'uploaded' | 'calibrated' | 'processing' | 'completed';
  createdAt: string;
}

export interface MapSettings {
  gridStyle: 'square' | 'hexagon' | 'isometric' | 'universal';
  unitOfMeasurement: 'imperial' | 'metric';
  paperSize: 'a4' | 'a3' | 'a2' | 'a1' | 'a0' | 'letter' | 'legal' | 'tabloid';
  gridOverlay: boolean;
  backgroundColor: string;
  averageBackgroundColor: boolean;
  gridMarkerColor: string;
  guideColor: string;
  generateBacksideNumbers: boolean;
  outlineStyle: 'dash' | 'solid' | 'dotted';
  outlineThickness: number;
  outlineColor: string;
}

export interface CalibrationData {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}
