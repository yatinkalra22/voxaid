"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Phone,
  Activity,
  Brain,
  MapPin,
  ArrowRight,
  Shield,
  Globe,
  Users,
} from "lucide-react";

const STEPS = [
  {
    icon: Phone,
    title: "Call or Send Voice Note",
    description:
      "Patient calls a free number or sends a WhatsApp voice note. No smartphone or data plan needed.",
  },
  {
    icon: Activity,
    title: "Voice Biomarker Analysis",
    description:
      "AI extracts jitter, shimmer, pitch, and pause patterns from 25 seconds of speech.",
  },
  {
    icon: Brain,
    title: "Risk Classification",
    description:
      "Our AI scores depression, anxiety, and NCD risk. Action plan generated in the patient's language.",
  },
  {
    icon: MapPin,
    title: "CHW Dashboard & Referral",
    description:
      "Community health workers see flagged patients on a map and refer to the nearest clinic in one click.",
  },
];

const STATS = [
  { value: "1.2B", label: "People with untreated mental disorders" },
  { value: "75%", label: "Receive no treatment in LMICs" },
  { value: "25s", label: "Of speech needed for screening" },
  { value: "$0.03", label: "Cost per screening at scale" },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <span className="font-heading text-lg sm:text-xl font-bold text-primary-700 shrink-0">
            VoxAID
          </span>
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="#how-it-works"
              className="hidden sm:inline text-sm font-medium text-slate-600 hover:text-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded"
            >
              How it works
            </a>
            <Link
              href="/story"
              className="hidden sm:inline text-sm font-medium text-slate-600 hover:text-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded"
            >
              Priya&apos;s Story
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-white bg-primary-700 hover:bg-primary-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 whitespace-nowrap"
            >
              <span className="sm:hidden">Login</span>
              <span className="hidden sm:inline">CHW Login</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Shield className="w-4 h-4" aria-hidden="true" />
              SDG 3 — Good Health & Well-being
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight text-balance leading-tight">
              Screen mental health with
              <span className="text-primary-700"> a phone call</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto text-balance">
              4 billion people will never see a psychiatrist. They will all
              eventually own a phone that makes calls. VoxAID is how we screen
              them.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-primary-700 text-white font-medium px-6 py-3 rounded-xl hover:bg-primary-800 transition-colors shadow-md"
              >
                See how it works
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <Link
                href="/story"
                className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 font-medium px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                Read Priya&apos;s Story
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-3xl sm:text-4xl font-bold text-primary-700 tabular-nums">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900">
              How it works
            </h2>
            <p className="mt-4 text-slate-600 max-w-xl mx-auto">
              From a 25-second phone call to a clinic referral — in under 60
              seconds.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-primary-700" />
                </div>
                <div className="absolute top-6 right-6 text-sm font-medium text-slate-300 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-heading text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alignment */}
      <section className="py-20 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900">
            Built for the last mile
          </h2>
          <p className="mt-4 text-slate-600 max-w-xl mx-auto">
            Designed for community health workers on $50 Android tablets in
            low-resource settings.
          </p>

          <div className="mt-12 grid sm:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <Globe className="w-6 h-6 text-primary-700 mx-auto mb-3" />
              <h3 className="font-heading font-semibold text-slate-900">
                Multilingual
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Hindi, Marathi, Punjabi, Bengali, Spanish, Swahili, English —
                every transcript also translated to English so the CHW can read
                it.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <Phone className="w-6 h-6 text-primary-700 mx-auto mb-3" />
              <h3 className="font-heading font-semibold text-slate-900">
                Feature phone ready
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Works with a basic phone call. No app download, no internet, no
                literacy required.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <Users className="w-6 h-6 text-primary-700 mx-auto mb-3" />
              <h3 className="font-heading font-semibold text-slate-900">
                CHW-first design
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Dashboard built for ASHA workers, BRAC volunteers, and Last Mile
                Health agents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-heading text-lg font-bold text-primary-700">
            VoxAID
          </span>
          <p className="text-sm text-slate-500">
            Voice-first health triage for the last 4 billion.
          </p>
        </div>
      </footer>
    </main>
  );
}
