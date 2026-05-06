import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — landing page, auth, and shareable referral slips.
// The audio rewrite is HMAC-token-authenticated server-side (10-min TTL bound
// to screening id), so Clerk must let it through; otherwise the <audio>
// element fetch gets a 404 and Vercel caches the 404 at the edge.
const isPublicRoute = createRouteMatcher([
  "/",
  "/story",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/r/(.*)",
  "/api/screenings/(.*)/audio",
]);

// Everything under /dashboard requires auth
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
