import { useState } from 'react';
import { api } from '../api.js';

export default function GradeEditor({ submission, onSaved }) {
  const [score, setScore] = useState(submission.score ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const { data } = await api.put(`/submissions/${submission.id}/grade`, {
        score: score === '' ? null : Number(score),
        feedback,
      });
      setMsg('✅ ذخیره شد');
      onSaved?.(data);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || 'خطا'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 100px' }}>
          <label style={{ fontSize: 12 }}>نمره (۰-۱۰۰)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            style={{ padding: 10 }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 12 }}>بازخورد</label>
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="مثال: آفرین، عالی بود!"
            style={{ padding: 10 }}
          />
        </div>
        <button
          className="btn"
          style={{ width: 'auto', margin: 0, padding: '10px 18px' }}
          disabled={saving}
          onClick={save}
        >
          {saving ? '...' : 'ذخیره'}
        </button>
      </div>
      {msg && <p style={{ marginTop: 8, fontSize: 13, color: msg.startsWith('✅') ? 'green' : 'red' }}>{msg}</p>}
    </div>
  );
}