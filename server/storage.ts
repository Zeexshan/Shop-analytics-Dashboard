import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import { ExcelStorage } from "./excel-storage";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  public excel: ExcelStorage;

  constructor() {
    this.users = new Map();
    this.excel = new ExcelStorage();
    
    // Create default admin user
    this.createDefaultUser();
  }

  private async createDefaultUser() {
    const defaultUser = await this.getUserByUsername('admin');
    if (!defaultUser) {
      await this.createUser({
        username: 'admin',
        password: '$2b$10$cM2I7lu2zO9W4RFDmchb/e5gr5gYZPH5H/FEWTdH5EKqpRL3zH57a' // ShopOwner@2024
      });
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
