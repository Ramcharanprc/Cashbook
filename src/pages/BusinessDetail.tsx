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
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editBookName, setEditBookName] = useState('');
  const [savingBookEdit, setSavingBookEdit] = useState(false);
  const [showEditBusiness, setShowEditBusiness] = useState(false);
  const [businessNameDraft, setBusinessNameDraft] = useState('');
  const [businessDescriptionDraft, setBusinessDescriptionDraft] = useState('');
  const [savingBusinessEdit, setSavingBusinessEdit] = useState(false);

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

  const openEditBook = (book: Book) => {
    setEditingBook(book);
    setEditBookName(book.name);
  };

  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editBookName.trim() || !businessId) return;
    setSavingBookEdit(true);
    const { data, error } = await supabase
      .from('books')
      .update({ name: editBookName.trim() })
      .eq('id', editingBook.id)
      .select()
      .single();

    if (!error && data) {
      setBooks(prev => prev.map(book => (book.id === data.id ? { ...book, ...data } : book)));
      setEditingBook(null);
      setEditBookName('');
    }

    setSavingBookEdit(false);
  };

  const openEditBusiness = () => {
    if (!business) return;
    setBusinessNameDraft(business.name);
    setBusinessDescriptionDraft(business.description ?? '');
    setShowEditBusiness(true);
  };

  const handleEditBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !businessNameDraft.trim()) return;
    setSavingBusinessEdit(true);
    const { data, error } = await supabase
      .from('businesses')
      .update({ name: businessNameDraft.trim(), description: businessDescriptionDraft.trim() || null })
      .eq('id', businessId)
      .select()
      .single();

    if (!error && data) {
      setBusiness(data);
      setShowEditBusiness(false);
      setBusinessNameDraft('');
      setBusinessDescriptionDraft('');
    }

    setSavingBusinessEdit(false);
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
        <div className="page-header-actions">
          <button className="btn-secondary" onClick={openEditBusiness}>Edit Business</button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Book</button>
        </div>
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

      {showEditBusiness && (
        <div className="modal-overlay" onClick={() => { setShowEditBusiness(false); setBusinessNameDraft(''); setBusinessDescriptionDraft(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Business</h3>
            <form onSubmit={handleEditBusiness}>
              <div className="form-group">
                <label>Business Name</label>
                <input value={businessNameDraft} onChange={e => setBusinessNameDraft(e.target.value)} placeholder="e.g. My Shop" required />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input value={businessDescriptionDraft} onChange={e => setBusinessDescriptionDraft(e.target.value)} placeholder="e.g. General store" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowEditBusiness(false); setBusinessNameDraft(''); setBusinessDescriptionDraft(''); }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={savingBusinessEdit}>{savingBusinessEdit ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <button className="btn-icon btn-edit" onClick={e => { e.stopPropagation(); openEditBook(b); }} title="Edit">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 17l-4 1 1-4 10.5-10.5z"/></svg>
                  </button>
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
