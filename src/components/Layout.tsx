import type { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  user: User;
  children: React.ReactNode;
}

export default function Layout({ user, children }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const email = user.email ?? 'User';

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
          <span className="header-email">{email}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
