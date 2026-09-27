import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api.js';

export default function StudentReport() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/student/report').then((r) => setData(r.data)); }, []);
  if (!data) return <div className="container" style={{ marginTop: 40 }}>در حال بارگذاری...</div>;
  const { student, submissions, summary, teacherStats } = data;
  const progress = submissions.filter((s) => s.score != null)
    .slice().sort((a, b) => new Date(a.gradedAt || a.submittedAt) - new Date(b.gradedAt || b.submittedAt))
    .map((s, i) => ({ index: i + 1, score: s.score }));

  return (
    <div>
      <div className="topbar">
        <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => nav('/student')}>← بازگشت</button>
        <h2>🎓 کارنامه من</h2>
      </div>
      <div className="container">
        <div className="card">
          <h3>{student.name}</h3>
          <p style={{ color: '#64748b', marginTop: 4 }}>{student.school?.name} • {student.grade?.name}</p>
        </div>
        <div className="grid">
          <div className="stat"><div className="num">{summary.total}</div>کل</div>
          <div className="stat"><div className="num">{summary.graded}</div>تصحیح‌شده</div>
          <div className="stat"><div className="num">{summary.pending}</div>در انتظار</div>
          <div className="stat"><div className="num">{summary.average ?? '—'}</div>میانگین</div>
        </div>
        {progress.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>📈 نمودار پیشرفت</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={progress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="index" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip contentStyle={{ fontFamily: 'Vazirmatn', direction: 'rtl' }} />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {teacherStats.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>👨‍🏫 میانگین هر دبیر</h3>
            {teacherStats.map((t) => (
              <div key={t.teacherId} style={{ padding: 12, background: '#f8fafc', borderRadius: 10, marginBottom: 8 }}>
                <b>{t.teacherName}</b>: {t.avg} / ۱۰۰ ({t.count} تکلیف)
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
