import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Product schema
export const products = pgTable("products", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost_price: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  stock: integer("stock").notNull(),
  min_stock: integer("min_stock").notNull(),
  supplier: text("supplier"),
  sku: text("sku").unique(),
  created_date: timestamp("created_date").defaultNow(),
  last_updated: timestamp("last_updated").defaultNow(),
});

// Sales schema
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey(),
  product_id: varchar("product_id").notNull(),
  product_name: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  profit: decimal("profit", { precision: 10, scale: 2 }).notNull(),
  customer_name: text("customer_name"),
  payment_method: text("payment_method").notNull(),
  sale_date: timestamp("sale_date").defaultNow(),
  cashier: text("cashier"),
  notes: text("notes"),
});

// Expenses schema
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  payment_method: text("payment_method").notNull(),
  vendor: text("vendor"),
  expense_date: timestamp("expense_date").defaultNow(),
  receipt_number: text("receipt_number"),
  notes: text("notes"),
});

// Goals schema
export const goals = pgTable("goals", {
  id: varchar("id").primaryKey(),
  period_type: text("period_type").notNull(),
  target_period: text("target_period").notNull(),
  revenue_goal: decimal("revenue_goal", { precision: 12, scale: 2 }).notNull(),
  profit_goal: decimal("profit_goal", { precision: 12, scale: 2 }).notNull(),
  sales_goal: integer("sales_goal").notNull(),
  created_date: timestamp("created_date").defaultNow(),
  status: text("status").notNull().default("Active"),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  created_date: true,
  last_updated: true,
}).extend({
  price: z.coerce.number().min(0.01),
  cost_price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  min_stock: z.coerce.number().int().min(1),
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  product_name: true,
  total_amount: true,
  profit: true,
  sale_date: true,
}).extend({
  quantity: z.coerce.number().int().min(1),
  unit_price: z.coerce.number().min(0.01),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  expense_date: true,
}).extend({
  amount: z.coerce.number().min(0.01),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  created_date: true,
}).extend({
  revenue_goal: z.coerce.number().min(1000),
  profit_goal: z.coerce.number().min(100),
  sales_goal: z.coerce.number().int().min(10),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;

// Analytics types
export interface KPIData {
  revenue: number;
  profit: number;
  salesCount: number;
  lowStockCount: number;
  goalProgress: number;
  revenueGrowth: number;
  profitGrowth: number;
  profitMargin: number;
  salesGrowth: number;
}

export interface ChartData {
  revenueData: Array<{ date: string; revenue: number }>;
  categoryData: Array<{ name: string; value: number; color: string }>;
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
}
