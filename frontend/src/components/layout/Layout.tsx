import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { PendingApprovalBanner } from '../ui/PendingApprovalBanner';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen md:h-screen">
      {/* Mobile navigation - hidden on desktop */}
      <MobileNav />

      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content with top padding on mobile for fixed header */}
      <main className="flex-1 md:overflow-auto pt-16 md:pt-0 p-4 md:p-6 pb-20 md:pb-6">
        <PendingApprovalBanner />
        {children}
      </main>
    </div>
  );
}
