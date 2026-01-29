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
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Project Management',
    description:
      'Create and manage research projects with structured workflows, milestones, and status tracking from proposal to publication.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Invite researchers across departments and institutions. Assign roles, manage permissions, and keep everyone aligned.',
  },
  {
    icon: CheckSquare,
    title: 'Task Tracking',
    description:
      'Break down research into actionable tasks with deadlines, assignees, and priority levels. Never miss a deliverable.',
  },
  {
    icon: FolderOpen,
    title: 'File Management',
    description:
      'Upload, organize, and share research documents, datasets, and supplementary materials in one secure location.',
  },
  {
    icon: Clock,
    title: 'Time Tracking',
    description:
      'Log hours spent on research activities. Generate timesheets for grant reporting and workload analysis.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description:
      'Get real-time overviews of project progress, team productivity, task completion rates, and research output.',
  },
  {
    icon: Shield,
    title: 'Secure Multi-Tenancy',
    description:
      'Each organization gets its own isolated workspace with role-based access control and data separation.',
  },
  {
    icon: Mail,
    title: 'Invite System',
    description:
      'Onboard new team members with invite codes and links. Control who joins your organization effortlessly.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Create Your Team',
    description:
      'Sign up and name your research group or lab. You become the admin automatically.',
  },
  {
    number: '2',
    title: 'Invite Researchers',
    description:
      'Send invite codes to colleagues. They join your workspace with one click.',
  },
  {
    number: '3',
    title: 'Manage & Deliver',
    description:
      'Create projects, assign tasks, share files, and track progress to completion.',
  },
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-blue-600" />
              <span className="text-xl font-bold text-blue-600">EduResearch</span>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm">
                How It Works
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm">
                Pricing
              </a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 text-sm">
                Login
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            Built for education and research teams
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Research project management,
            <br />
            <span className="text-blue-600">simplified</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            From proposal to publication, EduResearch helps academic teams organize projects,
            collaborate across institutions, and deliver results on time.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
            >
              See Features
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required. Free plan includes 3 users and 3 projects.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything your research team needs
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Purpose-built tools for academic collaboration, from task management to
              institutional reporting.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get started in minutes
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Three simple steps to organize your research team.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for Researchers Callout */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Built by researchers,
                <br />
                for researchers
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed mb-8">
                We understand the unique challenges of academic research — cross-institutional
                collaboration, grant compliance, student supervision, and publication deadlines.
                EduResearch is designed to handle all of it.
              </p>
              <div className="space-y-4">
                {[
                  'Multi-institutional team support',
                  'Role-based access for PIs, postdocs, and students',
                  'Time tracking for grant reporting',
                  'Secure, isolated workspaces per organization',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-white">
                    <CheckSquare className="w-5 h-5 text-blue-200 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-sm">
                <Globe className="w-16 h-16 text-blue-200 mx-auto mb-6" />
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-1">100%</div>
                  <div className="text-blue-200 text-sm">Multi-tenant isolation</div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/20 text-center">
                  <div className="text-4xl font-bold text-white mb-1">0</div>
                  <div className="text-blue-200 text-sm">Setup required</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Start free and upgrade as your team grows. No hidden fees.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl p-8 ${
                  plan.highlighted
                    ? 'ring-2 ring-blue-600 shadow-lg relative'
                    : 'shadow-sm'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
                <p className="text-gray-600 mt-2">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center text-gray-600 text-sm">
                      <CheckSquare className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.href.startsWith('mailto:') ? (
                  <a
                    href={plan.href}
                    className={`mt-8 block text-center py-3 rounded-lg font-medium transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    to={plan.href}
                    className={`mt-8 block text-center py-3 rounded-lg font-medium transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
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
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to streamline your research?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join research teams who use EduResearch to organize projects, collaborate
            effectively, and meet their deadlines.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create Your Team
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-6 h-6 text-blue-400" />
                <span className="text-lg font-bold text-white">EduResearch</span>
              </div>
              <p className="text-sm leading-relaxed">
                The project management platform built for education and research teams.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="mailto:support@eduresearch.app" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            &copy; {new Date().getFullYear()} EduResearch. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
