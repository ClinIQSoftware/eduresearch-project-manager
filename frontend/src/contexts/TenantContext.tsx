import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getTenantSlug, isPlatformAdmin } from '../config/tenant';
import * as api from '../services/api';

interface EnterpriseBranding {
  enterpriseName: string;
  logoUrl: string | null;
  primaryColor: string;
  faviconUrl: string | null;
}

interface TenantContextType {
  slug: string;
  isPlatformAdmin: boolean;
  branding: EnterpriseBranding | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<EnterpriseBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const slug = getTenantSlug();
  const isAdmin = isPlatformAdmin();

  useEffect(() => {
    if (isAdmin) {
      setIsLoading(false);
      return;
    }

    // Fetch branding
    api.getEnterpriseBranding()
      .then((res) => {
        setBranding({
          enterpriseName: res.data.enterprise_name,
          logoUrl: res.data.logo_url,
          primaryColor: res.data.primary_color,
          faviconUrl: res.data.favicon_url,
        });

        // Apply CSS variable
        document.documentElement.style.setProperty(
          '--color-primary-500',
          res.data.primary_color
        );

        // Update favicon
        if (res.data.favicon_url) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) link.href = res.data.favicon_url;
        }

        // Update document title
        document.title = `${res.data.enterprise_name} - EduResearch`;
      })
      .catch((err) => {
        console.error('Failed to load branding:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isAdmin]);

  return (
    <TenantContext.Provider value={{ slug, isPlatformAdmin: isAdmin, branding, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
