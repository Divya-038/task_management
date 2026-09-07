import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { tasks, users } from "../drizzle/schema";
import { emitTaskEvent } from "./realtime";
import * as db from "./db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";

const taskFields = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
  description: z.string().trim().max(1200).optional().default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "completed"]),
  category: z.string().trim().min(1).max(80),
  dueDate: z.coerce.date().nullable().optional(),
  assignedUserId: z.number().int().positive().nullable().optional(),
});

const listInput = z.object({
  search: z.string().optional().default(""),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  category: z.string().optional(),
  sort: z.enum(["newest", "oldest", "due", "priority"]).optional().default("newest"),
});

async function requireOwnedTask(id: number, userId: number, role: "user" | "admin") {
  const task = await db.getTaskById(id);
  if (!task) throw new Error("Task not found");
  if (role !== "admin" && task.userId !== userId) throw new Error("You do not have access to this task");
  return task;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const rows = await db.listTasks({ userId: ctx.user.id });
      const now = new Date();
      return {
        total: rows.length,
        todo: rows.filter(task => task.status === "todo").length,
        inProgress: rows.filter(task => task.status === "in_progress").length,
        completed: rows.filter(task => task.status === "completed").length,
        overdue: rows.filter(task => Boolean(task.dueDate && task.dueDate < now && task.status !== "completed")).length,
        highPriority: rows.filter(task => task.priority === "high" || task.priority === "urgent").length,
      };
    }),
  }),
  tasks: router({
    list: protectedProcedure.input(listInput).query(({ ctx, input }) => db.listTasks({ ...input, userId: ctx.user.id })),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const task = await requireOwnedTask(input.id, ctx.user.id, ctx.user.role);
      return task;
    }),
    create: protectedProcedure.input(taskFields).mutation(async ({ ctx, input }) => {
      const task = await db.createTask({ ...input, userId: ctx.user.id, description: input.description || null, dueDate: input.dueDate ?? null, assignedUserId: input.assignedUserId ?? null });
      if (task) emitTaskEvent({ type: "created", task: task as any });
      return task;
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: taskFields.partial() })).mutation(async ({ ctx, input }) => {
      await requireOwnedTask(input.id, ctx.user.id, ctx.user.role);
      const task = await db.updateTask(input.id, { ...input.data, dueDate: input.data.dueDate === undefined ? undefined : input.data.dueDate, description: input.data.description === undefined ? undefined : input.data.description || null });
      if (task) {
        emitTaskEvent({ type: "updated", task: task as any });
        if (input.data.status) emitTaskEvent({ type: "statusChanged", task: task as any });
      }
      return task;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const task = await requireOwnedTask(input.id, ctx.user.id, ctx.user.role);
      await db.deleteTask(input.id);
      emitTaskEvent({ type: "deleted", task: { id: task.id, userId: task.userId } });
      return { success: true } as const;
    }),
  }),
  profile: router({
    me: protectedProcedure.query(({ ctx }) => ctx.user),
    update: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(100), avatar: z.string().url().nullable().optional() })).mutation(async ({ ctx, input }) => db.updateProfile(ctx.user.id, input)),
  }),
  admin: router({
    stats: adminProcedure.query(() => db.getAdminStats()),
    users: adminProcedure.query(() => db.listUsers()),
    tasks: adminProcedure.input(listInput).query(({ input }) => db.listTasks(input)),
    deleteTask: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const task = await db.getTaskById(input.id);
      if (!task) throw new Error("Task not found");
      await db.deleteTask(input.id);
      emitTaskEvent({ type: "deleted", task: { id: task.id, userId: task.userId } });
      return { success: true } as const;
    }),
    promoteUser: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["user", "admin"]) })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database is not configured");
      await database.update(users).set({ role: input.role, updatedAt: new Date() }).where(eq(users.id, input.id));
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
