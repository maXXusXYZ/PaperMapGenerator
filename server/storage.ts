import { type MapProject, type InsertMapProject, type BatchJob, type InsertBatchJob, mapProjects, batchJobs } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getMapProject(id: string): Promise<MapProject | undefined>;
  createMapProject(project: InsertMapProject): Promise<MapProject>;
  updateMapProject(id: string, updates: Partial<MapProject>): Promise<MapProject | undefined>;
  deleteMapProject(id: string): Promise<boolean>;
  
  // Batch job methods
  getBatchJob(id: string): Promise<BatchJob | undefined>;
  createBatchJob(job: InsertBatchJob): Promise<BatchJob>;
  updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<BatchJob | undefined>;
  deleteBatchJob(id: string): Promise<boolean>;
  getAllBatchJobs(): Promise<BatchJob[]>;
}

export class DatabaseStorage implements IStorage {
  async getMapProject(id: string): Promise<MapProject | undefined> {
    try {
      const [project] = await db.select().from(mapProjects).where(eq(mapProjects.id, id));
      return project || undefined;
    } catch (error) {
      console.error('Error getting map project:', error);
      return undefined;
    }
  }

  async createMapProject(insertProject: InsertMapProject): Promise<MapProject> {
    const [project] = await db
      .insert(mapProjects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateMapProject(id: string, updates: Partial<MapProject>): Promise<MapProject | undefined> {
    try {
      const [updated] = await db
        .update(mapProjects)
        .set(updates)
        .where(eq(mapProjects.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating map project:', error);
      return undefined;
    }
  }

  async deleteMapProject(id: string): Promise<boolean> {
    try {
      const result = await db.delete(mapProjects).where(eq(mapProjects.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting map project:', error);
      return false;
    }
  }

  async getBatchJob(id: string): Promise<BatchJob | undefined> {
    try {
      const [job] = await db.select().from(batchJobs).where(eq(batchJobs.id, id));
      return job || undefined;
    } catch (error) {
      console.error('Error getting batch job:', error);
      return undefined;
    }
  }

  async createBatchJob(insertJob: InsertBatchJob): Promise<BatchJob> {
    const id = randomUUID();
    const [job] = await db
      .insert(batchJobs)
      .values({
        ...insertJob,
        id
      })
      .returning();
    return job;
  }

  async updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<BatchJob | undefined> {
    try {
      const [updated] = await db
        .update(batchJobs)
        .set(updates)
        .where(eq(batchJobs.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating batch job:', error);
      return undefined;
    }
  }

  async deleteBatchJob(id: string): Promise<boolean> {
    try {
      const result = await db.delete(batchJobs).where(eq(batchJobs.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting batch job:', error);
      return false;
    }
  }

  async getAllBatchJobs(): Promise<BatchJob[]> {
    try {
      return await db.select().from(batchJobs);
    } catch (error) {
      console.error('Error getting all batch jobs:', error);
      return [];
    }
  }
}

export class MemStorage implements IStorage {
  private mapProjects: Map<string, MapProject>;
  private batchJobs: Map<string, BatchJob>;

  constructor() {
    this.mapProjects = new Map();
    this.batchJobs = new Map();
  }

  async getMapProject(id: string): Promise<MapProject | undefined> {
    return this.mapProjects.get(id);
  }

  async createMapProject(insertProject: InsertMapProject): Promise<MapProject> {
    const id = randomUUID();
    const project: MapProject = { 
      ...insertProject, 
      id,
      imageWidth: insertProject.imageWidth,
      imageHeight: insertProject.imageHeight,
      scale: insertProject.scale ?? 1,
      offsetX: insertProject.offsetX ?? 0,
      offsetY: insertProject.offsetY ?? 0,
      rotation: insertProject.rotation ?? 0,
      status: insertProject.status ?? "uploaded",
      pdfUrl: insertProject.pdfUrl ?? null,
      createdAt: new Date().toISOString()
    };
    this.mapProjects.set(id, project);
    return project;
  }

  async updateMapProject(id: string, updates: Partial<MapProject>): Promise<MapProject | undefined> {
    const existing = this.mapProjects.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.mapProjects.set(id, updated);
    return updated;
  }

  async deleteMapProject(id: string): Promise<boolean> {
    return this.mapProjects.delete(id);
  }

  // Batch job implementation
  async getBatchJob(id: string): Promise<BatchJob | undefined> {
    return this.batchJobs.get(id);
  }

  async createBatchJob(insertJob: InsertBatchJob): Promise<BatchJob> {
    const id = randomUUID();
    const job: BatchJob = {
      ...insertJob,
      id,
      createdAt: new Date() as any,
      completedAt: null,
      errorMessage: null
    };
    this.batchJobs.set(id, job);
    return job;
  }

  async updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<BatchJob | undefined> {
    const existing = this.batchJobs.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.batchJobs.set(id, updated);
    return updated;
  }

  async deleteBatchJob(id: string): Promise<boolean> {
    return this.batchJobs.delete(id);
  }

  async getAllBatchJobs(): Promise<BatchJob[]> {
    return Array.from(this.batchJobs.values());
  }
}

export const storage = new DatabaseStorage();
