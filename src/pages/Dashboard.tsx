import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Business {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Props {
  user: User;
}

export default function Dashboard({ user }: Props) {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });
    setBusinesses(data ?? []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from('businesses')
      .insert({ name: name.trim(), description: description.trim() || null, user_id: user.id })
      .select()
      .single();
    if (data) {
      setBusinesses(prev => [data, ...prev]);
      setName('');
      setDescription('');
      setShowAdd(false);
    }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness || !editName.trim()) return;
    setEditingSaving(true);
    const { data, error } = await supabase
      .from('businesses')
      .update({ name: editName.trim(), description: editDescription.trim() || null })
      .eq('id', editingBusiness.id)
      .select()
      .single();

    if (!error && data) {
      setBusinesses(prev => prev.map(business => (business.id === data.id ? data : business)));
      setEditingBusiness(null);
      setEditName('');
      setEditDescription('');
    }

    setEditingSaving(false);
  };

  const openEditBusiness = (business: Business) => {
    setEditingBusiness(business);
    setEditName(business.name);
    setEditDescription(business.description ?? '');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this business and all its books/transactions?')) return;
    await supabase.from('businesses').delete().eq('id', id);
    setBusinesses(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Businesses</h2>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Business</button>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Business</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Business Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Shop" required />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. General store" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingBusiness && (
        <div className="modal-overlay" onClick={() => { setEditingBusiness(null); setEditName(''); setEditDescription(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Business</h3>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>Business Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. My Shop" required />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="e.g. General store" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setEditingBusiness(null); setEditName(''); setEditDescription(''); }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={editingSaving}>{editingSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : businesses.length === 0 ? (
        <div className="empty-state">
          <p>No businesses yet.</p>
          <p className="empty-hint">Click "Add Business" to get started!</p>
        </div>
      ) : (
        <div className="card-grid">
          {businesses.map(b => (
            <div key={b.id} className="card" onClick={() => navigate(`/business/${b.id}`)}>
              <div className="card-body">
                <h3>{b.name}</h3>
                {b.description && <p className="card-desc">{b.description}</p>}
              </div>
              <div className="card-actions">
                <button className="btn-icon btn-edit" onClick={e => { e.stopPropagation(); openEditBusiness(b); }} title="Edit">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 17l-4 1 1-4 10.5-10.5z"/></svg>
                </button>
                <button className="btn-icon btn-delete" onClick={e => { e.stopPropagation(); handleDelete(b.id); }} title="Delete">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
