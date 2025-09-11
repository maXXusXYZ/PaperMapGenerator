import { type MapProject, type InsertMapProject } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getMapProject(id: string): Promise<MapProject | undefined>;
  createMapProject(project: InsertMapProject): Promise<MapProject>;
  updateMapProject(id: string, updates: Partial<MapProject>): Promise<MapProject | undefined>;
  deleteMapProject(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private mapProjects: Map<string, MapProject>;

  constructor() {
    this.mapProjects = new Map();
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
}

export const storage = new MemStorage();
