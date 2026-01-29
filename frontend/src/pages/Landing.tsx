import { Link } from 'react-router-dom';
import { FileText, Users, FolderOpen, CheckSquare } from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Projects',
    description: 'Organize research projects with clear timelines and milestones.',
  },
  {
    icon: Users,
    title: 'Teams',
    description: 'Collaborate across institutions and departments seamlessly.',
  },
  {
    icon: FolderOpen,
    title: 'Files',
    description: 'Share documents, datasets, and research materials securely.',
  },
  {
    icon: CheckSquare,
    title: 'Tasks',
    description: 'Track progress with assignments, deadlines, and status updates.',
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
    features: ['Up to 10 users', 'Up to 15 projects', 'File sharing & full reports', 'Email support'],
    cta: 'Start with Starter',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Team',
    price: '$39',
    period: '/month',
    description: 'For departments',
    features: ['Up to 50 users', 'Unlimited projects', 'Cross-institutional collaboration', 'Priority support'],
    cta: 'Go with Team',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Institution',
    price: 'Custom',
    period: '',
    description: 'For universities',
    features: ['Unlimited users', 'Unlimited projects', 'SSO & custom integrations', 'Dedicated support & SLA'],
    cta: 'Contact Us',
    href: 'mailto:sales@eduresearch.app',
    highlighted: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-xl font-bold text-blue-600">EduResearch</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Manage Research Projects
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Collaborate across institutions, track progress, and deliver results.
            The project management platform built for education and research.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700"
            >
              Get Started Free
            </Link>
            <a
              href="#pricing"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to manage research
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white p-6 rounded-xl shadow-sm">
                <feature.icon className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Start free and upgrade as your team grows. No hidden fees.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl p-8 ${
                  plan.highlighted ? 'ring-2 ring-blue-600 shadow-lg' : 'shadow-sm'
                }`}
              >
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
                <p className="text-gray-600 mt-2">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center text-gray-600">
                      <CheckSquare className="w-5 h-5 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.href.startsWith('mailto:') ? (
                  <a
                    href={plan.href}
                    className={`mt-8 block text-center py-3 rounded-lg font-medium ${
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
                    className={`mt-8 block text-center py-3 rounded-lg font-medium ${
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

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">&copy; 2026 EduResearch. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="/terms" className="text-gray-600 hover:text-gray-900">Terms</a>
              <a href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
