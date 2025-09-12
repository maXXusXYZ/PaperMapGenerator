import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { promises as fs, createWriteStream } from "fs";
import { storage } from "./storage";
import { insertMapProjectSchema, mapSettingsSchema, insertBatchJobSchema, type MapProject, type BatchJob } from "@shared/schema";
import sharp from "sharp";
import PDFDocument from "pdfkit";

// Define extended Request type for multer file uploads
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads with enhanced format support
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // Increased to 50MB for high-res images
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg',
      'image/png', 
      'image/gif',
      'image/tiff', 'image/tif',
      'image/bmp',
      'image/webp',
      'image/svg+xml'
    ];
    
    // Additional validation by file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.bmp', '.webp', '.svg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    const isValidMime = allowedMimes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.includes(fileExtension);
    
    if (isValidMime && isValidExtension) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format. Allowed formats: ${allowedExtensions.join(', ')}`));
    }
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
      
      // Validate that we can get image dimensions
      if (!metadata.width || !metadata.height) {
        await fs.unlink(req.file.path);
        return res.status(400).json({ error: "Unable to process image - invalid dimensions" });
      }
      
      // Store file as base64 for simplicity (in production, use cloud storage)
      const base64Image = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
      
      const defaultSettings = mapSettingsSchema.parse({});
      
      const project = await storage.createMapProject({
        fileName: req.file.originalname,
        originalImageUrl: base64Image,
        imageWidth: metadata.width,
        imageHeight: metadata.height,
        settings: defaultSettings,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        status: "uploaded"
      });

      // Clean up temporary file
      await fs.unlink(req.file.path);

      res.json(project);
    } catch (error) {
      console.error("Upload error:", error);
      // Clean up temp file on error
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Failed to clean up temp file:", unlinkError);
        }
      }
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Update map calibration
  app.patch("/api/maps/:id/calibration", async (req, res) => {
    try {
      const { id } = req.params;
      const { scale, offsetX, offsetY, rotation } = req.body;

      if (typeof scale !== 'number' || typeof offsetX !== 'number' || typeof offsetY !== 'number' || typeof rotation !== 'number') {
        return res.status(400).json({ error: "Invalid calibration data" });
      }

      const updated = await storage.updateMapProject(id, {
        scale,
        offsetX,
        offsetY,
        rotation,
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

  // Batch processing routes
  // Create batch job
  app.post("/api/batch", upload.array('mapImages', 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const settings = mapSettingsSchema.parse(req.body.settings ? JSON.parse(req.body.settings) : {});
      const jobName = req.body.jobName || `Batch Job ${new Date().toISOString()}`;

      // Create projects for each uploaded file
      const projectIds: string[] = [];
      
      for (const file of files) {
        try {
          const fileBuffer = await fs.readFile(file.path);
          const metadata = await sharp(fileBuffer).metadata();
          
          if (!metadata.width || !metadata.height) {
            await fs.unlink(file.path);
            continue; // Skip invalid files
          }
          
          const base64Image = `data:${file.mimetype};base64,${fileBuffer.toString('base64')}`;
          
          const project = await storage.createMapProject({
            fileName: file.originalname,
            originalImageUrl: base64Image,
            imageWidth: metadata.width,
            imageHeight: metadata.height,
            settings,
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
            status: "uploaded"
          });

          projectIds.push(project.id);
          await fs.unlink(file.path);
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          await fs.unlink(file.path);
        }
      }

      if (projectIds.length === 0) {
        return res.status(400).json({ error: "No valid files could be processed" });
      }

      // Create batch job
      const batchJob = await storage.createBatchJob({
        name: jobName,
        totalFiles: projectIds.length,
        processedFiles: 0,
        failedFiles: 0,
        projectIds,
        settings,
        status: "pending"
      });

      res.json(batchJob);
    } catch (error) {
      console.error("Batch upload error:", error);
      res.status(500).json({ error: "Failed to create batch job" });
    }
  });

  // Get batch job status
  app.get("/api/batch/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const batchJob = await storage.getBatchJob(id);

      if (!batchJob) {
        return res.status(404).json({ error: "Batch job not found" });
      }

      res.json(batchJob);
    } catch (error) {
      console.error("Get batch job error:", error);
      res.status(500).json({ error: "Failed to get batch job" });
    }
  });

  // Get all batch jobs
  app.get("/api/batch", async (req, res) => {
    try {
      const batchJobs = await storage.getAllBatchJobs();
      res.json(batchJobs);
    } catch (error) {
      console.error("Get batch jobs error:", error);
      res.status(500).json({ error: "Failed to get batch jobs" });
    }
  });

  // Process batch job (start processing all maps in the batch)
  app.post("/api/batch/:id/process", async (req, res) => {
    try {
      const { id } = req.params;
      const batchJob = await storage.getBatchJob(id);

      if (!batchJob) {
        return res.status(404).json({ error: "Batch job not found" });
      }

      if (batchJob.status !== "pending") {
        return res.status(400).json({ error: "Batch job is not in pending status" });
      }

      // Update job status to running
      await storage.updateBatchJob(id, { status: "running" });

      // Process each project asynchronously
      processBatchJob(id).catch(error => {
        console.error(`Batch job ${id} processing failed:`, error);
        storage.updateBatchJob(id, { 
          status: "failed", 
          errorMessage: error.message,
          completedAt: new Date()
        });
      });

      res.json({ message: "Batch processing started" });
    } catch (error) {
      console.error("Process batch job error:", error);
      res.status(500).json({ error: "Failed to process batch job" });
    }
  });

  // Delete batch job
  app.delete("/api/batch/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBatchJob(id);

      if (!success) {
        return res.status(404).json({ error: "Batch job not found" });
      }

      res.json({ message: "Batch job deleted" });
    } catch (error) {
      console.error("Delete batch job error:", error);
      res.status(500).json({ error: "Failed to delete batch job" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Simplified PDF generation function
async function generatePDF(project: MapProject): Promise<string> {
  try {
    const doc = new PDFDocument();
    const fileName = `pdf_${project.id}.pdf`;
    const filePath = path.join('uploads', fileName);
    
    // Ensure uploads directory exists
    await fs.mkdir('uploads', { recursive: true });
    
    // Create a promise to wait for the PDF to finish writing
    const pdfPromise = new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      doc.pipe(writeStream);
    });
  
  // Extract image data from base64
  const base64Data = project.originalImageUrl.split(',')[1];
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  // Use stored image dimensions from the project
  const width = project.imageWidth;
  const height = project.imageHeight;
  
  // Calculate pages based on paper size and scale
  const settings = project.settings as any; // TODO: Improve typing for jsonb settings
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
      } catch (err: any) {
        console.error('Error processing image crop:', err);
        throw new Error(`Failed to process image crop at position (${x}, ${y}): ${err?.message || 'Unknown error'}`);
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
    
    // Wait for the PDF to finish writing
    await pdfPromise;
    
    return filePath;
  } catch (error: any) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF for project ${project.id}: ${error?.message || 'Unknown error'}`);
  }
}

// Batch job processing function
async function processBatchJob(batchJobId: string): Promise<void> {
  const batchJob = await storage.getBatchJob(batchJobId);
  if (!batchJob) {
    throw new Error("Batch job not found");
  }

  let processedCount = 0;
  let failedCount = 0;

  for (const projectId of batchJob.projectIds) {
    try {
      const project = await storage.getMapProject(projectId);
      if (!project) {
        failedCount++;
        continue;
      }

      // Update project status to processing
      await storage.updateMapProject(projectId, { status: "processing" });

      // Generate PDF for the project
      const pdfPath = await generatePDF(project);
      
      // Update project with PDF URL and completed status
      await storage.updateMapProject(projectId, {
        pdfUrl: pdfPath,
        status: "completed"
      });

      processedCount++;

      // Update batch job progress
      await storage.updateBatchJob(batchJobId, {
        processedFiles: processedCount,
        failedFiles: failedCount
      });

    } catch (error) {
      console.error(`Error processing project ${projectId}:`, error);
      failedCount++;
      
      // Update project status to failed
      await storage.updateMapProject(projectId, { status: "uploaded" });
      
      // Update batch job progress
      await storage.updateBatchJob(batchJobId, {
        processedFiles: processedCount,
        failedFiles: failedCount
      });
    }
  }

  // Mark batch job as completed
  await storage.updateBatchJob(batchJobId, {
    status: processedCount > 0 ? "completed" : "failed",
    processedFiles: processedCount,
    failedFiles: failedCount,
    completedAt: new Date(),
    errorMessage: failedCount === batchJob.totalFiles ? "All files failed to process" : undefined
  });
}
