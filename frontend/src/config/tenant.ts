const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export function getTenantSlug(): string {
  const host = window.location.hostname;

  // Development mode
  if (host === 'localhost' || host === '127.0.0.1') {
    return localStorage.getItem('dev_tenant') || 'default';
  }

  const subdomain = host.split('.')[0];

  if (!SLUG_PATTERN.test(subdomain)) {
    console.error('Invalid tenant subdomain:', subdomain);
    return 'default';
  }

  return subdomain;
}

export function isPlatformAdmin(): boolean {
  return getTenantSlug() === 'admin';
}

export function setDevTenant(slug: string): void {
  localStorage.setItem('dev_tenant', slug);
  window.location.reload();
}
