import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function StudentHome() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get('/student/me').then((r) => setMe(r.data));
    api.get('/student/tasks').then((r) => setTasks(r.data));
  }, []);

  return (
    <div>
      <div className="topbar">
        <h2>تکالیف من {me && `— ${me.name}`}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => nav('/student/report')}>🎓 کارنامه</button>
          <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => { localStorage.clear(); location.href = '/'; }}>خروج</button>
        </div>
      </div>
      <div className="container">
        {tasks.length === 0 && <p style={{ marginTop: 20 }}>تکلیفی برای شما ثبت نشده.</p>}
        {tasks.map((t) => {
          const submitted = t.submissions.length > 0;
          const expired = new Date(t.deadline) < new Date();
          return (
            <div key={t.id} className="task-card" onClick={() => nav(`/student/task/${t.id}`)} style={{ cursor: 'pointer' }}>
              <h3>{t.title}</h3>
              <p>{t.teacher.name}</p>
              <p>مهلت: {new Date(t.deadline).toLocaleString('fa-IR')}</p>
              <p style={{ marginTop: 8 }}>
                {submitted && <span className="badge ok">✅ ارسال شد</span>}
                {!submitted && expired && <span className="badge dang">مهلت تمام شد</span>}
                {!submitted && !expired && <span className="badge warn">در انتظار ارسال</span>}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
