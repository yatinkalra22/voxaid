import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — landing page and API health
const isPublicRoute = createRouteMatcher(["/", "/story", "/sign-in(.*)", "/sign-up(.*)"]);

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
