import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Nav, Footer } from "@/components/Nav";
import { Toaster } from "@/components/ui/sonner";
import { useOrderStatusNotifications } from "@/hooks/use-order-notifications";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">This drop doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-ink text-ink-foreground px-5 py-2 text-sm">Back home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-display">Something glitched.</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-ink text-ink-foreground px-5 py-2 text-sm"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sneaker Drop" },
      { name: "description", content: "Real-time sneaker drop monitor. Watch raffle orders flip from pending to shipped to delivered, live." },
      { property: "og:title", content: "Sneaker Drop" },
      { property: "og:description", content: "Real-time sneaker drop monitor. Watch raffle orders flip from pending to shipped to delivered, live." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Sneaker Drop" },
      { name: "twitter:description", content: "Real-time sneaker drop monitor. Watch raffle orders flip from pending to shipped to delivered, live." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/db78b109-e24f-441f-98ed-7bc1d77727e4/id-preview-cded9f19--8d5b6525-040e-4218-92d8-b77c860aded3.lovable.app-1779107873178.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/db78b109-e24f-441f-98ed-7bc1d77727e4/id-preview-cded9f19--8d5b6525-040e-4218-92d8-b77c860aded3.lovable.app-1779107873178.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useOrderStatusNotifications();
  return (
    <QueryClientProvider client={queryClient}>
      <Nav />
      <Outlet />
      <Footer />
      <Toaster />
    </QueryClientProvider>
  );
}
