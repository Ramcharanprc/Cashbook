import type { User } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  user: User;
  children: React.ReactNode;
}

export default function Layout({ user, children }: LayoutProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const email = user.email ?? 'User';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <h1 className="header-logo" onClick={() => navigate('/')}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.1"/>
              <path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
            </svg>
            CashEntries
          </h1>
        </div>
        <div className="header-right">
          <div className="header-account" ref={menuRef}>
            <button
              type="button"
              className="account-trigger"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(prev => !prev)}
            >
              <span className="account-email">{email}</span>
              <span className="account-caret">▾</span>
            </button>
            {menuOpen && (
              <div className="account-menu" role="menu">
                <button type="button" className="account-menu-item" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>
                  Change Password
                </button>
                <button type="button" className="account-menu-item" onClick={() => { setMenuOpen(false); handleLogout(); }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
