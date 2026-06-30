import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Transaction {
  id: string;
  type: 'cash_in' | 'cash_out';
  amount: number | string;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
}

const CASH_IN_CATEGORIES = [
  'Sales', 'Services', 'Salary', 'Interest', 'Rental Income', 'Investment', 'Gift Received', 'Refund', 'Other Income'
];
const CASH_OUT_CATEGORIES = [
  'Rent', 'Salary Paid', 'Utilities', 'Supplies', 'Food', 'Transport', 'Marketing', 'Maintenance', 'Tax', 'Insurance', 'Loan Payment', 'Other Expense'
];

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
  const [editingBook, setEditingBook] = useState<BookInfo | null>(null);
  const [editBookName, setEditBookName] = useState('');
  const [savingBookEdit, setSavingBookEdit] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editTransactionType, setEditTransactionType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [editTransactionAmount, setEditTransactionAmount] = useState('');
  const [editTransactionCategory, setEditTransactionCategory] = useState('');
  const [editTransactionDescription, setEditTransactionDescription] = useState('');
  const [editTransactionDate, setEditTransactionDate] = useState('');
  const [savingTransactionEdit, setSavingTransactionEdit] = useState(false);
  const [editTransactionError, setEditTransactionError] = useState('');

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

  const openEditBook = () => {
    if (!book) return;
    setEditingBook(book);
    setEditBookName(book.name);
  };

  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId || !editingBook || !editBookName.trim()) return;
    setSavingBookEdit(true);
    const { data, error } = await supabase
      .from('books')
      .update({ name: editBookName.trim() })
      .eq('id', editingBook.id)
      .select()
      .single();

    if (!error && data) {
      setBook(data);
      setEditingBook(null);
      setEditBookName('');
    }

    setSavingBookEdit(false);
  };

  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditTransactionType(transaction.type);
    setEditTransactionAmount(String(transaction.amount));
    setEditTransactionCategory(transaction.category);
    setEditTransactionDescription(transaction.description ?? '');
    setEditTransactionDate(transaction.date);
    setEditTransactionError('');
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !editTransactionAmount || !editTransactionCategory || !editTransactionDate) return;

    const numAmount = parseFloat(editTransactionAmount);
    if (!numAmount || numAmount <= 0) {
      setEditTransactionError('Please enter a valid amount');
      return;
    }

    setSavingTransactionEdit(true);
    setEditTransactionError('');

    const { data, error } = await supabase
      .from('transactions')
      .update({
        type: editTransactionType,
        amount: numAmount,
        category: editTransactionCategory,
        description: editTransactionDescription.trim() || null,
        date: editTransactionDate,
      })
      .eq('id', editingTransaction.id)
      .select()
      .single();

    if (!error && data) {
      setTransactions(prev => prev.map(tx => (tx.id === data.id ? { ...tx, ...data } : tx)));
      setEditingTransaction(null);
      setEditTransactionType('cash_in');
      setEditTransactionAmount('');
      setEditTransactionCategory('');
      setEditTransactionDescription('');
      setEditTransactionDate('');
    } else if (error) {
      setEditTransactionError(error.message);
    }

    setSavingTransactionEdit(false);
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

  const editingCategories = editTransactionType === 'cash_in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;

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
        <button className="btn-secondary" onClick={openEditBook}>Edit Book</button>
      </div>

      {editingBook && (
        <div className="modal-overlay" onClick={() => { setEditingBook(null); setEditBookName(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Book</h3>
            <form onSubmit={handleEditBook}>
              <div className="form-group">
                <label>Book Name</label>
                <input value={editBookName} onChange={e => setEditBookName(e.target.value)} placeholder="e.g. Daily Cash" required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setEditingBook(null); setEditBookName(''); }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={savingBookEdit}>{savingBookEdit ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTransaction && (
        <div className="modal-overlay" onClick={() => { setEditingTransaction(null); setEditTransactionType('cash_in'); setEditTransactionAmount(''); setEditTransactionCategory(''); setEditTransactionDescription(''); setEditTransactionDate(''); setEditTransactionError(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Cash Entry</h3>
            <form className="tx-form" onSubmit={handleEditTransaction}>
              {editTransactionError && <div className="form-error">{editTransactionError}</div>}

              <div className="form-group">
                <label>Type</label>
                <div className="category-grid">
                  <button
                    type="button"
                    className={`category-chip ${editTransactionType === 'cash_in' ? 'selected cash-in' : ''}`}
                    onClick={() => {
                      setEditTransactionType('cash_in');
                      setEditTransactionCategory(prev => CASH_IN_CATEGORIES.includes(prev) ? prev : 'Other Income');
                    }}
                  >
                    Cash In
                  </button>
                  <button
                    type="button"
                    className={`category-chip ${editTransactionType === 'cash_out' ? 'selected cash-out' : ''}`}
                    onClick={() => {
                      setEditTransactionType('cash_out');
                      setEditTransactionCategory(prev => CASH_OUT_CATEGORIES.includes(prev) ? prev : 'Other Expense');
                    }}
                  >
                    Cash Out
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={editTransactionAmount}
                    onChange={e => setEditTransactionAmount(e.target.value)}
                    placeholder="0"
                    required
                    min="0.01"
                    step="0.01"
                    className="amount-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>
                <div className="category-grid">
                  {editingCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-chip ${editTransactionCategory === cat ? `selected ${editTransactionType}` : ''}`}
                      onClick={() => setEditTransactionCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <input
                  value={editTransactionDescription}
                  onChange={e => setEditTransactionDescription(e.target.value)}
                  placeholder="Add a note..."
                />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={editTransactionDate}
                  onChange={e => setEditTransactionDate(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setEditingTransaction(null); setEditTransactionType('cash_in'); setEditTransactionAmount(''); setEditTransactionCategory(''); setEditTransactionDescription(''); setEditTransactionDate(''); setEditTransactionError(''); }}>Cancel</button>
                <button type="submit" className={`btn-primary ${editTransactionType === 'cash_in' ? 'cash-in-btn' : 'cash-out-btn'}`} disabled={savingTransactionEdit}>
                  {savingTransactionEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <button className="btn-icon btn-edit" onClick={() => openEditTransaction(t)} title="Edit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 17l-4 1 1-4 10.5-10.5z"/></svg>
                </button>
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
