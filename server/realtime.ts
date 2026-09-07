import type { Server as HttpServer, IncomingMessage } from "http";
import { Server } from "socket.io";
import type { User } from "../drizzle/schema";
import { sdk } from "./_core/sdk";

type RealtimeTask = {
  id: number;
  userId: number;
  [key: string]: unknown;
};

type TaskEvent = {
  type: "created" | "updated" | "deleted" | "statusChanged";
  task: RealtimeTask | { id: number; userId: number };
};

let io: Server | null = null;

function requestWithAuth(request: IncomingMessage, token?: string) {
  const headers = { ...(request.headers as Record<string, string | string[] | undefined>) };
  if (token && !headers.authorization) headers.authorization = `Bearer ${token}`;
  return { ...request, headers } as Parameters<typeof sdk.authenticateRequest>[0];
}

export function configureRealtime(server: HttpServer) {
  io = new Server(server, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    cors: { origin: true, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const user = await sdk.authenticateRequest(
        requestWithAuth(socket.request, socket.handshake.auth?.token)
      );
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized realtime session"));
    }
  });

  io.on("connection", socket => {
    const user = socket.data.user as User;
    socket.join(`user:${user.id}`);
    if (user.role === "admin") socket.join("admins");
    socket.emit("realtime:ready", { userId: user.id });
  });

  return io;
}

export function emitTaskEvent(event: TaskEvent) {
  if (!io) return;
  const userId = event.task.userId;
  io.to(`user:${userId}`).emit(`task:${event.type}`, event.task);
  io.to("admins").emit(`task:${event.type}`, event.task);
}
