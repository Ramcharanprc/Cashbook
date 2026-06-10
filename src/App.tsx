import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BusinessDetail = lazy(() => import('./pages/BusinessDetail'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const AddTransaction = lazy(() => import('./pages/AddTransaction'));

function PageLoader() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Layout user={user}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/business/:businessId" element={<BusinessDetail user={user} />} />
          <Route path="/business/:businessId/book/:bookId" element={<BookDetail user={user} />} />
          <Route path="/business/:businessId/book/:bookId/add/:type" element={<AddTransaction user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
