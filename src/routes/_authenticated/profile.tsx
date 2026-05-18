import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Sneaker Drop" }] }),
  component: ProfilePage,
});

type Profile = { id: string; display_name: string | null; avatar_url: string | null };
type Order = {
  id: number;
  product_name: string;
  size: string;
  status: string;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  shipped: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  delivered: "bg-green-500/10 text-green-600 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/30",
};

function ProfilePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (prof && active) {
        setProfile(prof as Profile);
        setName((prof as Profile).display_name ?? "");
      }

      const { data: ord } = await supabase
        .from("orders")
        .select("id, product_name, size, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (ord && active) setOrders(ord as Order[]);

      const channel = supabase
        .channel(`profile-orders-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setOrders((o) => [payload.new as Order, ...o]);
            } else if (payload.eventType === "UPDATE") {
              setOrders((o) => o.map((x) => (x.id === (payload.new as Order).id ? (payload.new as Order) : x)));
            } else if (payload.eventType === "DELETE") {
              setOrders((o) => o.filter((x) => x.id !== (payload.old as Order).id));
            }
          },
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    })();
    return () => { active = false; };
  }, []);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", userId);
    setSaving(false);
    if (error) toast.error("Save failed", { description: error.message });
    else toast.success("Profile updated");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <main className="mx-auto max-w-4xl px-6 pt-16 pb-24">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Account</p>
          <h1 className="mt-2 text-5xl font-display">Profile</h1>
        </div>
        <button onClick={signOut} className="rounded-full border border-border px-5 py-2 text-sm hover:bg-card transition-colors">
          Sign out
        </button>
      </div>

      <section className="mt-10 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Profile info</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <p className="mt-1 text-sm">{email}</p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">User ID</label>
            <p className="mt-1 text-xs text-muted-foreground font-mono truncate">{userId}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Display name</label>
            <div className="mt-1 flex gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={saveProfile}
                disabled={saving || name === (profile?.display_name ?? "")}
                className="rounded-full bg-ink text-ink-foreground px-5 text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Your orders</h2>
          <span className="text-sm text-muted-foreground">{orders.length} total</span>
        </div>
        {orders.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No orders yet. Head to the catalog and place one.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-normal text-xs uppercase tracking-wider">Product</th>
                  <th className="text-left px-5 py-3 font-normal text-xs uppercase tracking-wider">Size</th>
                  <th className="text-left px-5 py-3 font-normal text-xs uppercase tracking-wider">Placed</th>
                  <th className="text-left px-5 py-3 font-normal text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-5 py-3">{o.product_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.size}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs capitalize ${statusStyles[o.status] ?? "border-border text-muted-foreground"}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
