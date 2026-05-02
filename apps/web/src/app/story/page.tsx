import {
  Phone,
  Activity,
  Brain,
  MapPin,
  ArrowRight,
  Heart,
  Clock,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function StoryPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-heading text-xl font-bold text-primary-700"
          >
            VoxAID
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-medium text-primary-700 mb-4">
            A story from rural Bihar, India
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            Priya almost fell through the cracks.
            <br />
            <span className="text-primary-700">VoxAID caught her.</span>
          </h1>
        </div>
      </section>

      {/* Story */}
      <section className="pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* The problem */}
          <StoryBlock
            icon={Heart}
            label="The Problem"
            title="Priya is 28. She hasn't slept in weeks."
          >
            <p>
              Priya Sharma lives in a village outside Patna, Bihar. She has two
              children under 5. After her second pregnancy, something changed.
              She stopped going to the market. She stopped talking to her
              neighbors. Her husband works in Delhi and sends money, but she
              can&apos;t explain why she feels nothing.
            </p>
            <p>
              The nearest psychiatrist is 4 hours away by bus. She doesn&apos;t
              have a smartphone. She has never heard the word &ldquo;depression.&rdquo;
            </p>
            <p>
              Priya is one of <strong>1.2 billion people</strong> living with a
              mental disorder. 75% of them will never receive treatment.
            </p>
          </StoryBlock>

          {/* The CHW */}
          <StoryBlock
            icon={Users}
            label="The CHW"
            title="Sunita is her ASHA worker."
          >
            <p>
              Sunita visits 50 families in her area every month. She has a paper
              checklist for maternal health, nutrition, and immunization. But she
              has no tool for mental health. She knows Priya isn&apos;t doing
              well — she can see it — but she doesn&apos;t know how to measure
              it or what to do next.
            </p>
            <p>
              Until today. Today, Sunita has VoxAID.
            </p>
          </StoryBlock>

          {/* The call */}
          <StoryBlock
            icon={Phone}
            label="The Screening"
            title="One phone call. 25 seconds of speech."
          >
            <p>
              Sunita hands Priya a basic phone and dials the VoxAID number.
              A voice in Hindi asks Priya to describe how she&apos;s been
              feeling. Priya speaks for 25 seconds:
            </p>
            <blockquote className="border-l-4 border-primary-200 pl-4 py-2 my-4 text-slate-600 italic bg-slate-50 rounded-r-xl">
              &ldquo;Main bahut thak gayi hoon... raat ko neend nahi aati. Kuch
              achha nahi lagta. Bachche ki chinta rehti hai. Kaam mein mann nahi
              lagta.&rdquo;
            </blockquote>
            <p className="text-sm text-slate-500">
              Translation: &ldquo;I am very tired... I can&apos;t sleep at
              night. Nothing feels good. I worry about the children. I
              can&apos;t focus on work.&rdquo;
            </p>
          </StoryBlock>

          {/* The analysis */}
          <StoryBlock
            icon={Activity}
            label="The Analysis"
            title="AI hears what humans can't."
          >
            <p>
              In under 60 seconds, VoxAID analyzes Priya&apos;s voice — not
              just her words, but her vocal biomarkers:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-6">
              <BiomarkerPill label="F0 Mean" value="132 Hz" flag />
              <BiomarkerPill label="Jitter" value="3.2%" flag />
              <BiomarkerPill label="Shimmer" value="7.8%" flag />
              <BiomarkerPill label="HNR" value="9.2 dB" flag />
              <BiomarkerPill label="Pause Ratio" value="52%" flag />
              <BiomarkerPill label="Speech Rate" value="68 f/s" flag />
            </div>
            <p>
              Every biomarker is flagged. Her pitch is low, her voice trembles
              more than normal, she pauses frequently. The XGBoost classifier
              returns a <strong>depression risk score of 82%</strong> —
              critical.
            </p>
          </StoryBlock>

          {/* The action */}
          <StoryBlock
            icon={Brain}
            label="The Action Plan"
            title="Claude generates a plan Sunita can follow."
          >
            <p>
              Within seconds, an AI-generated action plan appears on
              Sunita&apos;s tablet — in Hindi:
            </p>
            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 my-4 text-sm text-slate-700 space-y-2">
              <p className="font-semibold text-primary-800">
                Immediate Actions:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Refer Priya to PHC Patna for mental health assessment</li>
                <li>Administer PHQ-9 questionnaire at next visit</li>
                <li>Follow up within 48 hours</li>
                <li>Inform ASHA supervisor of critical case</li>
                <li>Ensure family support system is aware</li>
              </ul>
            </div>
            <p>
              Priya also gets a callback on her phone — a voice in Hindi
              explaining what to expect and that help is on the way.
            </p>
          </StoryBlock>

          {/* The referral */}
          <StoryBlock
            icon={MapPin}
            label="The Referral"
            title="One click. The clinic knows she's coming."
          >
            <p>
              Sunita taps &ldquo;Refer to Clinic&rdquo; on her dashboard. An
              SMS is sent to the PHC Patna clinic admin with Priya&apos;s
              details, risk score, and urgency: &ldquo;Schedule assessment
              within 24 hours.&rdquo;
            </p>
            <p>
              The loop is closed. From phone call to clinic referral in under
              2 minutes.
            </p>
          </StoryBlock>

          {/* The impact */}
          <StoryBlock
            icon={Clock}
            label="The Impact"
            title="Before VoxAID, Priya had no path to care."
          >
            <div className="grid sm:grid-cols-2 gap-6 my-6">
              <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                <p className="font-semibold text-red-800 text-sm mb-2">
                  Without VoxAID
                </p>
                <ul className="text-sm text-red-700 space-y-1.5">
                  <li>Months or years undiagnosed</li>
                  <li>No screening tool available</li>
                  <li>4-hour bus ride to nearest psychiatrist</li>
                  <li>CHW has no way to measure or escalate</li>
                </ul>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                <p className="font-semibold text-emerald-800 text-sm mb-2">
                  With VoxAID
                </p>
                <ul className="text-sm text-emerald-700 space-y-1.5">
                  <li>Screened in 25 seconds</li>
                  <li>Risk quantified with voice biomarkers</li>
                  <li>Action plan in her language</li>
                  <li>Clinic referral in 2 minutes</li>
                </ul>
              </div>
            </div>
            <p>
              There are 4 billion people like Priya who will never see a
              psychiatrist. They will all eventually own a phone that makes
              calls.
            </p>
            <p className="font-heading text-xl font-bold text-primary-700 mt-4">
              VoxAID is how we screen them.
            </p>
          </StoryBlock>

          {/* CTA */}
          <div className="text-center pt-8 border-t border-slate-100">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-primary-700 text-white font-medium px-6 py-3 rounded-xl hover:bg-primary-800 transition-colors shadow-md"
            >
              See the CHW Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function StoryBlock({
  icon: Icon,
  label,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-700" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
          {label}
        </span>
      </div>
      <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 mb-4">
        {title}
      </h2>
      <div className="prose prose-slate prose-sm max-w-none space-y-3">
        {children}
      </div>
    </div>
  );
}

function BiomarkerPill({
  label,
  value,
  flag,
}: {
  label: string;
  value: string;
  flag?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2 text-center border ${
        flag
          ? "bg-red-50 border-red-100 text-red-700"
          : "bg-slate-50 border-slate-100 text-slate-700"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}
