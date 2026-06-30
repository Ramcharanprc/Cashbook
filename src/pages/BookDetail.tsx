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

const DEFAULT_CATEGORIES = {
  cash_in: ['Sales', 'Services', 'Salary', 'Interest', 'Rental Income', 'Investment', 'Gift Received', 'Refund', 'Other Income'],
  cash_out: ['Rent', 'Salary Paid', 'Utilities', 'Supplies', 'Food', 'Transport', 'Marketing', 'Maintenance', 'Tax', 'Insurance', 'Loan Payment', 'Other Expense'],
};

const parseAmountExpression = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const expression = trimmed.replace(/\s+/g, '');
  if (!/^[0-9()+\-*/.]+$/.test(expression)) return null;
  if (!/\d/.test(expression)) return null;
  if (/([+\-*/.]){2,}/.test(expression)) return null;
  if (/[+\-*/.](?=[+\-*/.])/ .test(expression)) return null;
  if (/^[+\-*/.]/.test(expression) || /[+\-*/.]$/.test(expression)) return null;
  if (expression.includes('..')) return null;

  const safeExpression = expression.replace(/[^0-9.+\-*/()]/g, '');

  try {
    const result = Function(`"use strict"; return (${safeExpression})`)();
    if (typeof result !== 'number' || !Number.isFinite(result) || result <= 0) {
      return null;
    }
    return Number(result.toFixed(2));
  } catch {
    return null;
  }
};

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
  const [editingBook, setEditingBook] = useState<BookInfo | null>(null);
  const [editBookName, setEditBookName] = useState('');
  const [savingBookEdit, setSavingBookEdit] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editTransactionType, setEditTransactionType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [editTransactionAmount, setEditTransactionAmount] = useState('');
  const [editTransactionCategory, setEditTransactionCategory] = useState('');
  const [editTransactionCustomCategory, setEditTransactionCustomCategory] = useState('');
  const [editTransactionDescription, setEditTransactionDescription] = useState('');
  const [editTransactionDate, setEditTransactionDate] = useState('');
  const [savingTransactionEdit, setSavingTransactionEdit] = useState(false);
  const [editTransactionError, setEditTransactionError] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES.cash_in);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'cash_in' | 'cash_out'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [draftTypeFilter, setDraftTypeFilter] = useState<'all' | 'cash_in' | 'cash_out'>('all');
  const [draftCategoryFilter, setDraftCategoryFilter] = useState<'all' | string>('all');
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');

  useEffect(() => {
    if (!bookId) return;
    fetchData();
  }, [bookId]);

  useEffect(() => {
    if (!bookId) return;
    supabase.from('transactions').select('category').eq('book_id', bookId).then((response: { data: Array<{ category: string | null }> | null }) => {
      const existing = (response.data ?? []).map((item: { category: string | null }) => item.category).filter(Boolean) as string[];
      const merged = Array.from(new Set([...DEFAULT_CATEGORIES.cash_in, ...DEFAULT_CATEGORIES.cash_out, ...existing]));
      setAvailableCategories(merged);
    });
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
    setEditTransactionCustomCategory('');
    setEditTransactionDescription(transaction.description ?? '');
    setEditTransactionDate(transaction.date);
    setEditTransactionError('');
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !editTransactionAmount || !editTransactionDate) return;

    const finalCategory = editTransactionCustomCategory.trim() || editTransactionCategory;
    if (!finalCategory) {
      setEditTransactionError('Please select or create a category');
      return;
    }

    const numAmount = parseAmountExpression(editTransactionAmount);
    if (!numAmount) {
      setEditTransactionError('Please enter a valid amount or simple calculation such as 788+776');
      return;
    }

    setSavingTransactionEdit(true);
    setEditTransactionError('');

    const { data, error } = await supabase
      .from('transactions')
      .update({
        type: editTransactionType,
        amount: numAmount,
        category: finalCategory,
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
      setEditTransactionCustomCategory('');
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

  const filtered = transactions.filter(t => {
    const typeMatch = typeFilter === 'all' ? true : t.type === typeFilter;
    const categoryMatch = categoryFilter === 'all' ? true : t.category === categoryFilter;
    const fromMatch = !dateFrom || t.date >= dateFrom;
    const toMatch = !dateTo || t.date <= dateTo;
    return typeMatch && categoryMatch && fromMatch && toMatch;
  });
  const visibleCategories = Array.from(new Set(transactions.map(t => t.category))).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== 'all' || Boolean(dateFrom) || Boolean(dateTo);
  const totalIn = transactions.filter(t => t.type === 'cash_in').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter(t => t.type === 'cash_out').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIn - totalOut;

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
  };

  const editingCategories = editTransactionType === 'cash_in' ? availableCategories : availableCategories;

  const openFiltersModal = () => {
    setDraftTypeFilter(typeFilter);
    setDraftCategoryFilter(categoryFilter);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setShowFiltersModal(true);
  };

  const applyFilters = () => {
    setTypeFilter(draftTypeFilter);
    setCategoryFilter(draftCategoryFilter);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setShowFiltersModal(false);
  };

  const clearFilters = () => {
    setDraftTypeFilter('all');
    setDraftCategoryFilter('all');
    setDraftDateFrom('');
    setDraftDateTo('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
    setShowFiltersModal(false);
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
        <div className="modal-overlay" onClick={() => { setEditingTransaction(null); setEditTransactionType('cash_in'); setEditTransactionAmount(''); setEditTransactionCategory(''); setEditTransactionCustomCategory(''); setEditTransactionDescription(''); setEditTransactionDate(''); setEditTransactionError(''); }}>
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
                      setEditTransactionCategory(prev => availableCategories.includes(prev) ? prev : 'Other Income');
                    }}
                  >
                    Cash In
                  </button>
                  <button
                    type="button"
                    className={`category-chip ${editTransactionType === 'cash_out' ? 'selected cash-out' : ''}`}
                    onClick={() => {
                      setEditTransactionType('cash_out');
                      setEditTransactionCategory(prev => availableCategories.includes(prev) ? prev : 'Other Expense');
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
                    type="text"
                    inputMode="decimal"
                    value={editTransactionAmount}
                    onChange={e => setEditTransactionAmount(e.target.value.replace(/[^0-9()+\-*/.]/g, ''))}
                    placeholder="e.g. 788+776"
                    required
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
                      onClick={() => {
                        setEditTransactionCategory(cat);
                        setEditTransactionCustomCategory('');
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  value={editTransactionCustomCategory}
                  onChange={e => {
                    setEditTransactionCustomCategory(e.target.value);
                    if (e.target.value.trim()) setEditTransactionCategory(e.target.value.trim());
                  }}
                  placeholder="Or create your own category"
                />
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
                <button type="button" className="btn-secondary" onClick={() => { setEditingTransaction(null); setEditTransactionType('cash_in'); setEditTransactionAmount(''); setEditTransactionCategory(''); setEditTransactionCustomCategory(''); setEditTransactionDescription(''); setEditTransactionDate(''); setEditTransactionError(''); }}>Cancel</button>
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

      {showFiltersModal && (
        <div className="modal-overlay" onClick={() => setShowFiltersModal(false)}>
          <div className="modal modal-filter" onClick={e => e.stopPropagation()}>
            <h3>Filter Transactions</h3>

            <div className="filter-section">
              <label>Type</label>
              <div className="filter-option-list">
                <button type="button" className={`btn-filter ${draftTypeFilter === 'all' ? 'active' : ''}`} onClick={() => setDraftTypeFilter('all')}>All</button>
                <button type="button" className={`btn-filter cash-in ${draftTypeFilter === 'cash_in' ? 'active' : ''}`} onClick={() => setDraftTypeFilter('cash_in')}>Cash In</button>
                <button type="button" className={`btn-filter cash-out ${draftTypeFilter === 'cash_out' ? 'active' : ''}`} onClick={() => setDraftTypeFilter('cash_out')}>Cash Out</button>
              </div>
            </div>

            <div className="filter-section">
              <label>Category</label>
              <div className="filter-option-list">
                <button type="button" className={`btn-filter ${draftCategoryFilter === 'all' ? 'active' : ''}`} onClick={() => setDraftCategoryFilter('all')}>All Categories</button>
                {visibleCategories.map(cat => (
                  <button key={cat} type="button" className={`btn-filter ${draftCategoryFilter === cat ? 'active' : ''}`} onClick={() => setDraftCategoryFilter(cat)}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <label>Date Range</label>
              <div className="filter-date-row">
                <input type="date" value={draftDateFrom} onChange={e => setDraftDateFrom(e.target.value)} />
                <input type="date" value={draftDateTo} onChange={e => setDraftDateTo(e.target.value)} />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={clearFilters}>Clear</button>
              <button type="button" className="btn-primary" onClick={applyFilters}>Apply</button>
            </div>
          </div>
        </div>
      )}

      <div className="action-bar">
        <div className="filter-group">
          <button className={`btn-filter ${hasActiveFilters ? 'active' : ''}`} onClick={openFiltersModal}>
            {hasActiveFilters ? 'Filters •' : 'Filters'}
          </button>
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
