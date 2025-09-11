import { MapProject } from "@/types/map";

export interface PaperSize {
  width: number;
  height: number;
  name: string;
}

export const PAPER_SIZES: Record<string, PaperSize> = {
  a4: { width: 595, height: 842, name: 'A4' },
  a3: { width: 842, height: 1191, name: 'A3' },
  a2: { width: 1191, height: 1684, name: 'A2' },
  letter: { width: 612, height: 792, name: 'Letter' },
  legal: { width: 612, height: 1008, name: 'Legal' },
  tabloid: { width: 792, height: 1224, name: 'Tabloid' },
};

export interface GridCalculation {
  pagesX: number;
  pagesY: number;
  totalPages: number;
  pageSize: PaperSize;
  scaledDimensions: {
    width: number;
    height: number;
  };
}

export function calculateGridLayout(
  imageWidth: number,
  imageHeight: number,
  scale: number,
  paperSize: string
): GridCalculation {
  const paper = PAPER_SIZES[paperSize] || PAPER_SIZES.a4;
  
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  
  const pagesX = Math.ceil(scaledWidth / paper.width);
  const pagesY = Math.ceil(scaledHeight / paper.height);
  
  return {
    pagesX,
    pagesY,
    totalPages: pagesX * pagesY,
    pageSize: paper,
    scaledDimensions: {
      width: scaledWidth,
      height: scaledHeight
    }
  };
}

export function getPageCoordinates(
  pageIndex: number,
  gridLayout: GridCalculation
): { x: number; y: number; pageX: number; pageY: number } {
  const pageX = pageIndex % gridLayout.pagesX;
  const pageY = Math.floor(pageIndex / gridLayout.pagesX);
  
  const x = pageX * gridLayout.pageSize.width;
  const y = pageY * gridLayout.pageSize.height;
  
  return { x, y, pageX, pageY };
}

export function generateCropArea(
  pageIndex: number,
  gridLayout: GridCalculation,
  originalWidth: number,
  originalHeight: number,
  scale: number
) {
  const { x, y } = getPageCoordinates(pageIndex, gridLayout);
  
  const cropX = x / scale;
  const cropY = y / scale;
  const cropWidth = Math.min(gridLayout.pageSize.width / scale, originalWidth - cropX);
  const cropHeight = Math.min(gridLayout.pageSize.height / scale, originalHeight - cropY);
  
  return {
    left: Math.floor(cropX),
    top: Math.floor(cropY),
    width: Math.floor(cropWidth),
    height: Math.floor(cropHeight)
  };
}
