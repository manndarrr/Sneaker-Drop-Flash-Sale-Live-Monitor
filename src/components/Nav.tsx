import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";

export function Nav() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/60">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Sneaker Drop" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-brand text-xl">Sneaker Drop</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm absolute left-1/2 -translate-x-1/2">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }} className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          <Link to="/products" activeProps={{ className: "text-foreground" }} className="text-muted-foreground hover:text-foreground transition-colors">Catalog</Link>
          {authed && (
            <Link to="/drop" activeProps={{ className: "text-foreground" }} className="text-muted-foreground hover:text-foreground transition-colors">Live Drop</Link>
          )}
          {authed && (
            <Link to="/profile" activeProps={{ className: "text-foreground" }} className="text-muted-foreground hover:text-foreground transition-colors">Profile</Link>
          )}
        </nav>
        <div className="w-[88px] flex justify-end">
          {authed && <NotificationBell />}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 mt-24 my-0">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>Sneaker Drop — Live sneaker drops.</span>
        <span>Realtime by Supabase.</span>
      </div>
    </footer>
  );
}
