import { Link } from 'react-router-dom';
import {
  FileText,
  Users,
  FolderOpen,
  CheckSquare,
  Clock,
  BarChart3,
  Shield,
  Mail,
  ArrowRight,
  GraduationCap,
  Zap,
  Globe,
  Sparkles,
  Rocket,
  Star,
  ChevronRight,
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Project Management',
    description:
      'Structured workflows from proposal to publication. Milestones, status tracking, and clear ownership.',
    color: 'from-blue-500 to-cyan-400',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Invite researchers across departments and institutions. Assign roles and keep everyone in sync.',
    color: 'from-violet-500 to-purple-400',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: CheckSquare,
    title: 'Task Tracking',
    description:
      'Break research into actionable tasks with deadlines, assignees, and priority levels.',
    color: 'from-emerald-500 to-green-400',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: FolderOpen,
    title: 'File Management',
    description:
      'Upload, organize, and share documents, datasets, and supplementary materials securely.',
    color: 'from-amber-500 to-yellow-400',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: Clock,
    title: 'Time Tracking',
    description:
      'Log hours for grant reporting and workload analysis. Generate timesheets automatically.',
    color: 'from-rose-500 to-pink-400',
    bg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description:
      'Real-time dashboards for project progress, team productivity, and research output.',
    color: 'from-sky-500 to-blue-400',
    bg: 'bg-sky-50',
    iconColor: 'text-sky-600',
  },
  {
    icon: Shield,
    title: 'Secure Workspaces',
    description:
      'Each organization gets isolated data, role-based access, and full administrative control.',
    color: 'from-slate-600 to-gray-500',
    bg: 'bg-slate-50',
    iconColor: 'text-slate-600',
  },
  {
    icon: Mail,
    title: 'Smart Invitations',
    description:
      'Onboard new members with invite codes and links. Control access effortlessly.',
    color: 'from-teal-500 to-emerald-400',
    bg: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
];

const steps = [
  {
    number: '1',
    title: 'Create Your Team',
    description:
      'Sign up and name your research group. You become the admin instantly — no approval needed.',
    emoji: '🚀',
  },
  {
    number: '2',
    title: 'Invite Your People',
    description:
      'Share an invite code or link. Colleagues join your workspace with one click.',
    emoji: '🤝',
  },
  {
    number: '3',
    title: 'Ship Great Research',
    description:
      'Create projects, assign tasks, share files, and track progress all the way to publication.',
    emoji: '🎯',
  },
];

const stats = [
  { value: '100%', label: 'Data Isolation', sublabel: 'Per organization' },
  { value: '3', label: 'Free Users', sublabel: 'No credit card needed' },
  { value: '<2min', label: 'Setup Time', sublabel: 'Start immediately' },
  { value: '∞', label: 'Possibilities', sublabel: 'Unlimited projects on Team+' },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'For individual researchers',
    features: ['Up to 3 users', 'Up to 3 projects', 'Core project management'],
    cta: 'Get Started Free',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$12',
    period: '/month',
    description: 'For research labs',
    features: [
      'Up to 10 users',
      'Up to 15 projects',
      'File sharing & full reports',
      'Email support',
    ],
    cta: 'Start with Starter',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Team',
    price: '$39',
    period: '/month',
    description: 'For departments',
    features: [
      'Up to 50 users',
      'Unlimited projects',
      'Cross-institutional collaboration',
      'Priority support',
    ],
    cta: 'Go with Team',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Institution',
    price: 'Custom',
    period: '',
    description: 'For universities',
    features: [
      'Unlimited users',
      'Unlimited projects',
      'SSO & custom integrations',
      'Dedicated support & SLA',
    ],
    cta: 'Contact Us',
    href: 'mailto:sales@eduresearch.app',
    highlighted: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                EduResearch
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                Pricing
              </a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                Login
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-600 to-violet-600 text-white px-5 py-2 rounded-full hover:shadow-lg hover:shadow-blue-200 text-sm font-medium transition-all hover:-translate-y-0.5"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-cyan-100 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200/50 text-blue-700 text-sm font-medium px-5 py-2 rounded-full mb-8 shadow-sm">
            <Sparkles className="w-4 h-4" />
            The research management platform teams actually enjoy
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-8 leading-[1.1] tracking-tight">
            Stop juggling spreadsheets.
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Start shipping research.
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-500 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            EduResearch gives your academic team one place to organize projects,
            collaborate across institutions, and hit every deadline from proposal to publication.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
            >
              Create Your Team — It's Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-full text-lg font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              See What's Inside
            </a>
          </div>

          <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            Free forever for teams up to 3. No credit card required.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-900 font-medium mt-1">{stat.label}</div>
                <div className="text-gray-400 text-sm">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 text-blue-600 text-sm font-semibold mb-4 uppercase tracking-wider">
              <Star className="w-4 h-4" />
              Features
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Everything your research team needs
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Purpose-built tools for academic collaboration — no bloat, no complexity, just what works.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative bg-white p-7 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-28 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 text-violet-600 text-sm font-semibold mb-4 uppercase tracking-wider">
              <Rocket className="w-4 h-4" />
              Getting Started
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Up and running in minutes
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              No demos, no sales calls, no 30-page setup guides. Just sign up and go.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.number} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200" />
                )}
                <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow text-center">
                  <div className="text-4xl mb-4">{step.emoji}</div>
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-full text-sm font-bold mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for Researchers Callout */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 border border-white/20 rounded-full" />
          <div className="absolute bottom-10 right-10 w-96 h-96 border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/10 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-8 leading-tight">
                Built by researchers,
                <br />
                for researchers
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed mb-10">
                We understand the unique challenges of academic research — cross-institutional
                collaboration, grant compliance, student supervision, and publication deadlines.
                EduResearch handles all of it so you can focus on what matters: the research.
              </p>
              <div className="space-y-4">
                {[
                  'Multi-institutional team support',
                  'Role-based access for PIs, postdocs, and students',
                  'Time tracking for grant reporting',
                  'Secure, isolated workspaces per organization',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-white">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 border border-white/20 max-w-sm w-full">
                <Globe className="w-16 h-16 text-blue-200 mx-auto mb-8" />
                <div className="text-center space-y-8">
                  <div>
                    <div className="text-5xl font-extrabold text-white mb-1">100%</div>
                    <div className="text-blue-200 font-medium">Multi-tenant isolation</div>
                  </div>
                  <div className="border-t border-white/20" />
                  <div>
                    <div className="text-5xl font-extrabold text-white mb-1">&lt;2min</div>
                    <div className="text-blue-200 font-medium">From signup to first project</div>
                  </div>
                  <div className="border-t border-white/20" />
                  <div>
                    <div className="text-5xl font-extrabold text-white mb-1">24/7</div>
                    <div className="text-blue-200 font-medium">Your data, always accessible</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 text-emerald-600 text-sm font-semibold mb-4 uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              Pricing
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Start free. Upgrade when you need more. No hidden fees, no surprises.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-blue-600 to-violet-700 text-white shadow-2xl shadow-blue-200 relative scale-105'
                    : 'bg-white shadow-sm border border-gray-100 hover:shadow-lg'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline">
                  <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`ml-1 ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`mt-2 ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>
                  {plan.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-center text-sm ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}
                    >
                      <CheckSquare className={`w-4 h-4 mr-2 flex-shrink-0 ${plan.highlighted ? 'text-blue-200' : 'text-emerald-500'}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.href.startsWith('mailto:') ? (
                  <a
                    href={plan.href}
                    className={`mt-8 block text-center py-3 rounded-full font-semibold transition-all ${
                      plan.highlighted
                        ? 'bg-white text-blue-600 hover:shadow-lg'
                        : 'border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    to={plan.href}
                    className={`mt-8 block text-center py-3 rounded-full font-semibold transition-all ${
                      plan.highlighted
                        ? 'bg-white text-blue-600 hover:shadow-lg'
                        : 'border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-60" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-50 rounded-full blur-3xl opacity-60" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="text-5xl mb-6">🎓</div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Ready to do your best research?
          </h2>
          <p className="text-xl text-gray-500 mb-10 leading-relaxed">
            Join research teams who traded chaos for clarity.
            Your next breakthrough deserves better than a shared spreadsheet.
          </p>
          <Link
            to="/register"
            className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white px-10 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
          >
            Get Started Free
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-4 text-sm text-gray-400">
            Free forever for small teams. Upgrade anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">EduResearch</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                The project management platform built for education and research teams who are serious about results.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="mailto:support@eduresearch.app" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-sm text-center text-gray-600">
            &copy; {new Date().getFullYear()} EduResearch. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
