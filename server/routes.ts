import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { storage } from "./storage";
import { insertMapProjectSchema, mapSettingsSchema, type MapProject } from "@shared/schema";
import sharp from "sharp";
import PDFDocument from "pdfkit";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/tiff'];
    cb(null, allowedMimes.includes(file.mimetype));
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload map image
  app.post("/api/maps/upload", upload.single('mapImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileBuffer = await fs.readFile(req.file.path);
      const metadata = await sharp(fileBuffer).metadata();
      
      // Store file as base64 for simplicity (in production, use cloud storage)
      const base64Image = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
      
      const defaultSettings = mapSettingsSchema.parse({});
      
      const project = await storage.createMapProject({
        fileName: req.file.originalname,
        originalImageUrl: base64Image,
        settings: defaultSettings,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        status: "uploaded"
      });

      // Clean up temporary file
      await fs.unlink(req.file.path);

      res.json(project);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Update map calibration
  app.patch("/api/maps/:id/calibration", async (req, res) => {
    try {
      const { id } = req.params;
      const { scale, offsetX, offsetY } = req.body;

      if (typeof scale !== 'number' || typeof offsetX !== 'number' || typeof offsetY !== 'number') {
        return res.status(400).json({ error: "Invalid calibration data" });
      }

      const updated = await storage.updateMapProject(id, {
        scale,
        offsetX,
        offsetY,
        status: "calibrated"
      });

      if (!updated) {
        return res.status(404).json({ error: "Map project not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Calibration error:", error);
      res.status(500).json({ error: "Failed to update calibration" });
    }
  });

  // Update map settings
  app.patch("/api/maps/:id/settings", async (req, res) => {
    try {
      const { id } = req.params;
      const settings = mapSettingsSchema.parse(req.body);

      const updated = await storage.updateMapProject(id, { settings });

      if (!updated) {
        return res.status(404).json({ error: "Map project not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Generate PDF
  app.post("/api/maps/:id/generate-pdf", async (req, res) => {
    const { id } = req.params;
    try {
      const project = await storage.getMapProject(id);

      if (!project) {
        return res.status(404).json({ error: "Map project not found" });
      }

      if (project.status !== "calibrated") {
        return res.status(400).json({ error: "Map must be calibrated first" });
      }

      // Update status to processing
      await storage.updateMapProject(id, { status: "processing" });

      // Generate PDF (simplified implementation)
      const pdfPath = await generatePDF(project);
      
      // Update project with PDF URL
      const completed = await storage.updateMapProject(id, {
        pdfUrl: pdfPath,
        status: "completed"
      });

      res.json(completed);
    } catch (error) {
      console.error("PDF generation error:", error);
      await storage.updateMapProject(id, { status: "calibrated" }); // Reset status on error
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Get map project
  app.get("/api/maps/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getMapProject(id);

      if (!project) {
        return res.status(404).json({ error: "Map project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ error: "Failed to get project" });
    }
  });

  // Download PDF
  app.get("/api/maps/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getMapProject(id);

      if (!project || !project.pdfUrl) {
        return res.status(404).json({ error: "PDF not found" });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${project.fileName.replace(/\.[^/.]+$/, "")}_printable.pdf"`);
      
      const pdfBuffer = await fs.readFile(project.pdfUrl);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Simplified PDF generation function
async function generatePDF(project: any): Promise<string> {
  const doc = new PDFDocument();
  const fileName = `pdf_${project.id}.pdf`;
  const filePath = path.join('uploads', fileName);
  
  doc.pipe(require('fs').createWriteStream(filePath));
  
  // Extract image data from base64
  const base64Data = project.originalImageUrl.split(',')[1];
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const { width = 800, height = 600 } = metadata;
  
  // Calculate pages based on paper size and scale
  const settings = project.settings;
  const paperSizes: Record<string, { width: number; height: number }> = {
    a4: { width: 595, height: 842 },
    a3: { width: 842, height: 1191 },
    a2: { width: 1191, height: 1684 },
    a1: { width: 1684, height: 2384 },
    a0: { width: 2384, height: 3370 },
    letter: { width: 612, height: 792 },
    legal: { width: 612, height: 1008 },
    tabloid: { width: 792, height: 1224 },
  };
  
  const paperSize = paperSizes[settings.paperSize as string] || paperSizes.a4;
  const scaledWidth = width * project.scale;
  const scaledHeight = height * project.scale;
  
  const pagesX = Math.ceil(scaledWidth / paperSize.width);
  const pagesY = Math.ceil(scaledHeight / paperSize.height);
  
  // Generate map pages
  for (let y = 0; y < pagesY; y++) {
    for (let x = 0; x < pagesX; x++) {
      if (x > 0 || y > 0) doc.addPage();
      
      // Calculate crop area
      const cropX = (x * paperSize.width) / project.scale;
      const cropY = (y * paperSize.height) / project.scale;
      const cropWidth = Math.min(paperSize.width / project.scale, width - cropX);
      const cropHeight = Math.min(paperSize.height / project.scale, height - cropY);
      
      try {
        // Crop image section
        const croppedBuffer = await sharp(imageBuffer)
          .extract({
            left: Math.floor(cropX),
            top: Math.floor(cropY),
            width: Math.floor(cropWidth),
            height: Math.floor(cropHeight)
          })
          .png()
          .toBuffer();
        
        // Add image to PDF
        doc.image(croppedBuffer, 0, 0, {
          width: cropWidth * project.scale,
          height: cropHeight * project.scale
        });
        
        // Add cut lines if enabled
        if (settings.outlineStyle !== 'none') {
          doc.strokeColor(settings.outlineColor);
          doc.lineWidth(settings.outlineThickness);
          
          if (settings.outlineStyle === 'dash') {
            doc.dash(5, { space: 5 });
          } else if (settings.outlineStyle === 'dotted') {
            doc.dash(1, { space: 3 });
          }
          
          doc.rect(10, 10, paperSize.width - 20, paperSize.height - 20).stroke();
        }
      } catch (err) {
        console.error('Error processing image crop:', err);
      }
      
      // Add backside numbering page if enabled
      if (settings.generateBacksideNumbers && (x < pagesX - 1 || y < pagesY - 1)) {
        doc.addPage();
        const pageNumber = y * pagesX + x + 1;
        doc.fontSize(72)
           .fillColor('#000000')
           .text(pageNumber.toString(), paperSize.width / 2 - 20, paperSize.height / 2 - 36, {
             align: 'center'
           });
      }
    }
  }
  
  // Add assembly guide as final page
  doc.addPage();
  doc.fontSize(16).fillColor('#000000').text('Assembly Guide', 50, 50);
  
  // Create miniature grid showing page numbers
  const gridSize = 200;
  const cellWidth = gridSize / pagesX;
  const cellHeight = gridSize / pagesY;
  
  for (let y = 0; y < pagesY; y++) {
    for (let x = 0; x < pagesX; x++) {
      const pageNum = y * pagesX + x + 1;
      const cellX = 50 + x * cellWidth;
      const cellY = 100 + y * cellHeight;
      
      doc.rect(cellX, cellY, cellWidth, cellHeight).stroke();
      doc.fontSize(10).text(pageNum.toString(), cellX + cellWidth/2 - 5, cellY + cellHeight/2 - 5);
    }
  }
  
  doc.end();
  
  return filePath;
}
