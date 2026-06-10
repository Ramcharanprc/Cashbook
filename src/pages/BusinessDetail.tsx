import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Book {
  id: string;
  name: string;
  created_at: string;
  transactions?: Array<{ type: 'cash_in' | 'cash_out'; amount: number | string }>;
}

interface BusinessInfo {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  user: User;
}

export default function BusinessDetail({ user }: Props) {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    fetchBusinessAndBooks();
  }, [businessId]);

  const fetchBusinessAndBooks = async () => {
    const [bizRes, booksRes] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', businessId).single(),
      supabase.from('books').select('id, name, created_at, transactions(type, amount)').eq('business_id', businessId).order('created_at', { ascending: false }),
    ]);
    if (bizRes.data) setBusiness(bizRes.data);
    setBooks(booksRes.data ?? []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !businessId) return;
    setSaving(true);
    const { data } = await supabase
      .from('books')
      .insert({ name: name.trim(), business_id: businessId, user_id: user.id })
      .select()
      .single();
    if (data) {
      setBooks(prev => [data, ...prev]);
      setName('');
      setShowAdd(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this book and all its transactions?')) return;
    await supabase.from('books').delete().eq('id', id);
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  };

  const calculateBookBalance = (book: Book) => {
    return (book.transactions ?? []).reduce((total, transaction) => {
      return total + (transaction.type === 'cash_in' ? Number(transaction.amount) : -Number(transaction.amount));
    }, 0);
  };

  if (loading) return <div className="page"><div className="empty-state">Loading...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
            Back
          </button>
          <h2>{business?.name ?? 'Business'}</h2>
          {business?.description && <p className="page-subtitle">{business.description}</p>}
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Book</button>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Book</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Book Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Cash" required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div className="empty-state">
          <p>No books yet.</p>
          <p className="empty-hint">Click "Add Book" to start tracking cash!</p>
        </div>
      ) : (
        <div className="book-list">
          {books.map(b => {
            const balance = calculateBookBalance(b);
            return (
              <div key={b.id} className="card book-row" onClick={() => navigate(`/business/${businessId}/book/${b.id}`)}>
                <div className="card-body">
                  <h3>{b.name}</h3>
                  <p className="card-desc">Tap to view entries</p>
                </div>
                <div className="book-row-right">
                  <p className={`book-balance ${balance >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(balance)}</p>
                  <button className="btn-icon btn-delete" onClick={e => { e.stopPropagation(); handleDelete(b.id); }} title="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
