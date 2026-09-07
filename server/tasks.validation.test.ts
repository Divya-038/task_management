import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const baseContext = (user: TrpcContext["user"] = null): TrpcContext => ({
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("tasks access and validation", () => {
  it("rejects task listing without an authenticated session", async () => {
    const caller = appRouter.createCaller(baseContext());
    await expect(caller.tasks.list({ search: "", sort: "newest" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects task creation with an invalid short title before database access", async () => {
    const caller = appRouter.createCaller(baseContext({
      id: 12,
      openId: "validation-user",
      name: "Validation User",
      email: "validation@example.com",
      loginMethod: "test",
      role: "user",
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));

    await expect(caller.tasks.create({
      title: "x",
      description: "",
      priority: "medium",
      status: "todo",
      category: "Work",
      dueDate: null,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
