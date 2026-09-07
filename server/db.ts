import { alias } from "drizzle-orm/mysql-core";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertTask, InsertUser, Task, tasks, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "avatar"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listTasks(params: {
  userId?: number;
  search?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high" | "urgent";
  category?: string;
  sort?: "newest" | "oldest" | "due" | "priority";
}) {
  const db = await getDb();
  if (!db) return [] as Array<Task & { assignedName: string | null; ownerName: string | null }>;
  const assignedUser = alias(users, "assigned_user");
  const ownerUser = alias(users, "owner_user");
  const conditions = [];
  if (params.userId) conditions.push(eq(tasks.userId, params.userId));
  if (params.status) conditions.push(eq(tasks.status, params.status));
  if (params.priority) conditions.push(eq(tasks.priority, params.priority));
  if (params.category) conditions.push(eq(tasks.category, params.category));
  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(or(like(tasks.title, pattern), like(tasks.description, pattern), like(tasks.category, pattern)));
  }
  const sortColumn = params.sort === "oldest" ? asc(tasks.createdAt) : params.sort === "due" ? asc(tasks.dueDate) : params.sort === "priority" ? desc(sql`FIELD(${tasks.priority}, 'urgent', 'high', 'medium', 'low')`) : desc(tasks.createdAt);
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      category: tasks.category,
      dueDate: tasks.dueDate,
      userId: tasks.userId,
      assignedUserId: tasks.assignedUserId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assignedName: assignedUser.name,
      ownerName: ownerUser.name,
    })
    .from(tasks)
    .leftJoin(assignedUser, eq(tasks.assignedUserId, assignedUser.id))
    .leftJoin(ownerUser, eq(tasks.userId, ownerUser.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sortColumn);
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0];
}

export async function createTask(input: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.insert(tasks).values(input);
  return getTaskById(Number(result[0].insertId));
}

export async function updateTask(id: number, input: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(tasks).set({ ...input, updatedAt: new Date() }).where(eq(tasks.id, id));
  return getTaskById(id);
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function updateProfile(id: number, input: { name?: string; avatar?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(users).set({ ...input, updatedAt: new Date() }).where(eq(users.id, id));
  return db.select().from(users).where(eq(users.id, id)).limit(1).then(rows => rows[0]);
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0 };
  const today = new Date();
  const [userCount, total, completed, pending, overdue] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(tasks),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(eq(tasks.status, "completed")),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(eq(tasks.status, "todo")),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(sql`${tasks.dueDate} < ${today}`, sql`${tasks.status} <> 'completed'`)),
  ]);
  return { totalUsers: Number(userCount[0]?.count ?? 0), totalTasks: Number(total[0]?.count ?? 0), completedTasks: Number(completed[0]?.count ?? 0), pendingTasks: Number(pending[0]?.count ?? 0), overdueTasks: Number(overdue[0]?.count ?? 0) };
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.createdAt));
}
