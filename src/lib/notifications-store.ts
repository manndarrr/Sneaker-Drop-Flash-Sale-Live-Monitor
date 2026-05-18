import { useSyncExternalStore } from "react";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
};

let notifications: AppNotification[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const notificationsStore = {
  add(n: Omit<AppNotification, "id" | "createdAt" | "read"> & { id?: string }) {
    const id = n.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // de-dupe by id
    if (notifications.some((x) => x.id === id)) return;
    notifications = [{ id, title: n.title, body: n.body, createdAt: Date.now(), read: false }, ...notifications].slice(0, 50);
    emit();
  },
  markAllRead() {
    if (notifications.every((n) => n.read)) return;
    notifications = notifications.map((n) => ({ ...n, read: true }));
    emit();
  },
  clear() {
    notifications = [];
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get() {
    return notifications;
  },
};

export function useNotifications() {
  return useSyncExternalStore(
    notificationsStore.subscribe,
    notificationsStore.get,
    notificationsStore.get,
  );
}
