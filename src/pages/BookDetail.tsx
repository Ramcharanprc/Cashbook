import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Transaction {
  id: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
}

interface BookInfo {
  id: string;
  name: string;
}

interface Props {
  user: User;
}

export default function BookDetail(_props: Props) {
  const { businessId, bookId } = useParams<{ businessId: string; bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'cash_in' | 'cash_out'>('all');

  useEffect(() => {
    if (!bookId) return;
    fetchData();
  }, [bookId]);

  const fetchData = async () => {
    const [bookRes, txRes] = await Promise.all([
      supabase.from('books').select('*').eq('id', bookId).single(),
      supabase.from('transactions').select('*').eq('book_id', bookId).order('date', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    if (bookRes.data) setBook(bookRes.data);
    setTransactions(txRes.data ?? []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
  const totalIn = transactions.filter(t => t.type === 'cash_in').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter(t => t.type === 'cash_out').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIn - totalOut;

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  };

  if (loading) return <div className="page"><div className="empty-state">Loading...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate(`/business/${businessId}`)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
            Back
          </button>
          <h2>{book?.name ?? 'Book'}</h2>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card cash-in">
          <p className="summary-label">Cash In</p>
          <p className="summary-value">{formatCurrency(totalIn)}</p>
        </div>
        <div className="summary-card cash-out">
          <p className="summary-label">Cash Out</p>
          <p className="summary-value">{formatCurrency(totalOut)}</p>
        </div>
        <div className={`summary-card balance ${balance >= 0 ? 'positive' : 'negative'}`}>
          <p className="summary-label">Balance</p>
          <p className="summary-value">{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="action-bar">
        <div className="filter-group">
          <button className={`btn-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`btn-filter cash-in ${filter === 'cash_in' ? 'active' : ''}`} onClick={() => setFilter('cash_in')}>Cash In</button>
          <button className={`btn-filter cash-out ${filter === 'cash_out' ? 'active' : ''}`} onClick={() => setFilter('cash_out')}>Cash Out</button>
        </div>
        <div className="action-buttons">
          <button className="btn-cash-in" onClick={() => navigate(`/business/${businessId}/book/${bookId}/add/cash_in`)}>
            + Cash In
          </button>
          <button className="btn-cash-out" onClick={() => navigate(`/business/${businessId}/book/${bookId}/add/cash_out`)}>
            - Cash Out
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No transactions yet.</p>
          <p className="empty-hint">Use "Cash In" or "Cash Out" to add entries!</p>
        </div>
      ) : (
        <div className="transaction-list">
          {filtered.map(t => (
            <div key={t.id} className={`transaction-item ${t.type}`}>
              <div className="tx-left">
                <span className={`tx-type-badge ${t.type}`}>
                  {t.type === 'cash_in' ? '+' : '-'}
                </span>
                <div className="tx-info">
                  <p className="tx-category">{t.category}</p>
                  {t.description && <p className="tx-desc">{t.description}</p>}
                  <p className="tx-date">{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="tx-right">
                <span className={`tx-amount ${t.type}`}>
                  {t.type === 'cash_in' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                </span>
                <button className="btn-icon btn-delete-sm" onClick={() => handleDelete(t.id)} title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
