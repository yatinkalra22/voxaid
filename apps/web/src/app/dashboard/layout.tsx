import { UserButton } from "@clerk/nextjs";
import { Activity, Users, Map } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="font-heading text-lg font-bold text-primary-700"
            >
              VoxAID
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <NavLink href="/dashboard" icon={Users} label="Patients" />
              <NavLink href="/dashboard/map" icon={Map} label="Map" />
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Activity className="w-4 h-4 text-primary-600" />
              <span className="hidden sm:inline">CHW Dashboard</span>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-primary-700 hover:bg-primary-50 transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
