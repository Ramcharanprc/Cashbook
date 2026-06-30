import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Props {
  user: User;
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

export default function AddTransaction({ user }: Props) {
  const { businessId, bookId, type } = useParams<{ businessId: string; bookId: string; type: string }>();
  const navigate = useNavigate();
  const isCashIn = type === 'cash_in';

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(isCashIn ? 'Other Income' : 'Other Expense');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES[isCashIn ? 'cash_in' : 'cash_out']);

  useEffect(() => {
    if (!bookId) return;

    const loadCategories = async () => {
      const { data } = await supabase.from('transactions').select('category').eq('book_id', bookId).eq('user_id', user.id);
      const existing = (data ?? []).map((item: { category: string | null }) => item.category).filter(Boolean) as string[];
      const merged = Array.from(new Set([...DEFAULT_CATEGORIES[isCashIn ? 'cash_in' : 'cash_out'], ...existing]));
      setCategories(merged);
      if (merged.length > 0) {
        setCategory(prev => prev || merged[0]);
      }
    };

    void loadCategories();
  }, [bookId, isCashIn, user.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalCategory = customCategory.trim() || category;
    const numAmount = parseAmountExpression(amount);
    if (!numAmount) {
      setError('Please enter a valid amount or simple calculation such as 788+776');
      return;
    }
    if (!finalCategory) {
      setError('Please select or create a category');
      return;
    }

    setSaving(true);
    const { error: dbError } = await supabase.from('transactions').insert({
      book_id: bookId,
      user_id: user.id,
      type,
      amount: numAmount,
      category: finalCategory,
      description: description.trim() || null,
      date,
    });

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
    } else {
      navigate(`/business/${businessId}/book/${bookId}`);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate(`/business/${businessId}/book/${bookId}`)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
            Back
          </button>
          <h2>{isCashIn ? 'Cash In' : 'Cash Out'}</h2>
        </div>
      </div>

      <form className="tx-form" onSubmit={handleSave}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label>Amount</label>
          <div className="amount-input-wrapper">
            <span className="currency-symbol">₹</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9()+\-*/.]/g, ''))}
              placeholder="e.g. 788+776"
              required
              className="amount-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Category</label>
          <div className="category-grid">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`category-chip ${category === cat ? 'selected' : ''} ${isCashIn ? 'cash-in' : 'cash-out'}`}
                onClick={() => {
                  setCategory(cat);
                  setCustomCategory('');
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <input
            value={customCategory}
            onChange={e => {
              setCustomCategory(e.target.value);
              if (e.target.value.trim()) setCategory(e.target.value.trim());
            }}
            placeholder="Or create your own category"
          />
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a note..."
          />
        </div>

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        <button type="submit" className={`btn-primary btn-full ${isCashIn ? 'cash-in-btn' : 'cash-out-btn'}`} disabled={saving}>
          {saving ? 'Saving...' : `Save ${isCashIn ? 'Cash In' : 'Cash Out'}`}
        </button>
      </form>
    </div>
  );
}
