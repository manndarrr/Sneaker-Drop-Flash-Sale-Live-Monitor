import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notificationsStore } from "@/lib/notifications-store";

/**
 * Global subscription: when the signed-in user's order status changes
 * in the database, show a toast and push an in-app notification.
 */
export function useOrderStatusNotifications() {
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let currentUserId: string | null = null;

    const setup = async (userId: string) => {
      // tear down any previous channel
      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }
      currentUserId = userId;

      channel = supabase
        .channel(`order-status-notify-${userId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
          (payload) => {
            const oldStatus = (payload.old as { status?: string } | null)?.status;
            const newRow = payload.new as {
              id: number;
              status: string;
              product_name: string;
              size: string;
            };
            if (!newRow || oldStatus === newRow.status) return;

            const title = `Order #${newRow.id} is ${newRow.status}`;
            const body = `${newRow.product_name} (size ${newRow.size}) — status updated to ${newRow.status}.`;

            toast(title, { description: body });
            notificationsStore.add({
              id: `order-${newRow.id}-${newRow.status}-${Date.now()}`,
              title,
              body,
            });
          },
        )
        .subscribe();
    };

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (data.user) await setup(data.user.id);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return;
      const uid = session?.user?.id ?? null;
      if (uid && uid !== currentUserId) {
        await setup(uid);
      } else if (!uid && channel) {
        await supabase.removeChannel(channel);
        channel = null;
        currentUserId = null;
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
}
