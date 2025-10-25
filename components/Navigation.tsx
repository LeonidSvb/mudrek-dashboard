'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/logs', label: 'Logs' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="mx-auto max-w-7xl px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Sales Analytics</span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex md:gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side - placeholder for user menu, notifications, etc */}
          <div className="flex items-center gap-4">
            {/* Add user avatar, settings, etc here later */}
          </div>
        </div>
      </div>
    </nav>
  );
}
