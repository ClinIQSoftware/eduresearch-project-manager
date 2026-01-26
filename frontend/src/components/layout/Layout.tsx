import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { PendingApprovalBanner } from '../ui/PendingApprovalBanner';
import UpgradeBanner from '../UpgradeBanner';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      <UpgradeBanner />
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile navigation - hidden on desktop */}
        <MobileNav />

        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main content with top padding on mobile for fixed header */}
        <main className="flex-1 overflow-auto pt-16 md:pt-0 p-4 md:p-6">
          <PendingApprovalBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
