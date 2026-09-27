import { useEffect, useState } from 'react';
import { api } from '../api.js';
import GradeEditor from '../components/GradeEditor.jsx';

export default function TeacherDashboard() {
  const [tab, setTab] = useState('tasks');
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  async function load() {
    const { data: m } = await api.get('/teacher/me');
    setMe(m);
    const stored = localStorage.getItem('activeSchool');
    const valid = m.schools.find((s) => s.id === stored);
    const active = valid?.id || m.schools[0]?.id || '';
    setSchoolId(active);
    localStorage.setItem('activeSchool', active);
    if (active) {
      const { data } = await api.get(`/teacher/tasks?schoolId=${active}`);
      setTasks(data);
    }
  }
  useEffect(() => { load(); }, []);

  async function switchSchool(id) {
    setSchoolId(id);
    localStorage.setItem('activeSchool', id);
    const { data } = await api.get(`/teacher/tasks?schoolId=${id}`);
    setTasks(data);
    setSelectedTask(null);
  }

  if (!me) return <div className="container" style={{ marginTop: 40 }}>در حال بارگذاری...</div>;
  const activeSchool = me.schools.find((s) => s.id === schoolId);
  const activeGrades = me.assignments.filter((a) => a.schoolId === schoolId).map((a) => ({ id: a.gradeId, name: a.gradeName }));

  return (
    <div>
      <div className="topbar">
        <div>
          <h2 style={{ fontSize: 16 }}>👨‍🏫 {me.name}</h2>
          {me.schools.length > 1 ? (
            <select value={schoolId} onChange={(e) => switchSchool(e.target.value)} style={{ marginTop: 6, padding: '6px 10px', fontSize: 14 }}>
              {me.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{activeSchool?.name}</p>
          )}
        </div>
        <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => { localStorage.clear(); location.href = '/'; }}>خروج</button>
      </div>
      <nav className="tabs">
        {[['tasks','📋 تکالیف'],['new','📝 ایجاد تکلیف']].map(([k,l]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => { setTab(k); setSelectedTask(null); }}>{l}</button>
        ))}
      </nav>
      <div className="container">
        {tab === 'tasks' && !selectedTask && (
          <>
            {tasks.length === 0 && <p>تکلیفی ندارید.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="task-card">
                <h3>{t.title}</h3>
                <p>{t.grade.name}</p>
                <p>مهلت: {new Date(t.deadline).toLocaleString('fa-IR')}</p>
                <p style={{ marginTop: 6 }}>
                  <span className={`badge ${new Date(t.deadline) > new Date() ? 'ok' : 'warn'}`}>
                    {new Date(t.deadline) > new Date() ? 'فعال' : 'منقضی'}
                  </span>{' '}
                  <span className="badge ok">{t._count.submissions} ارسال</span>
                </p>
                <button className="btn" style={{ marginTop: 10 }} onClick={() => setSelectedTask(t)}>مشاهده ارسال‌ها</button>
              </div>
            ))}
          </>
        )}
        {tab === 'tasks' && selectedTask && <Submissions task={selectedTask} onBack={() => setSelectedTask(null)} />}
        {tab === 'new' && <NewTask schoolId={schoolId} grades={activeGrades} onCreated={load} />}
      </div>
    </div>
  );
}

function NewTask({ schoolId, grades, onCreated }) {
  const [gradeId, setGradeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [msg, setMsg] = useState('');
  async function save() {
    if (!gradeId || !title || !deadline) return alert('اطلاعات ناقص');
    await api.post('/teacher/tasks', {
      schoolId, gradeId, title, description,
      startDate: startDate || new Date().toISOString(), deadline,
    });
    setMsg('✅ تکلیف ایجاد شد');
    setTitle(''); setDescription(''); setDeadline('');
    setTimeout(onCreated, 800);
  }
  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>ایجاد تکلیف جدید</h3>
      <label>پایه</label>
      <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
        <option value="">انتخاب کنید</option>
        {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <label>عنوان</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>توضیحات</label>
      <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} />
      <label>تاریخ شروع</label>
      <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <label>مهلت پایان</label>
      <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      {msg && <p style={{ color: 'green', marginTop: 10 }}>{msg}</p>}
      <button className="btn" onClick={save}>🚀 انتشار</button>
    </div>
  );
}

function Submissions({ task, onBack }) {
  const [data, setData] = useState(null);

  async function load() {
    const r = await api.get(`/teacher/task/${task.id}/submissions`);
    setData(r.data);
  }

  useEffect(() => {
    load();
  }, [task.id]);

  return (
    <>
      <button className="btn secondary" style={{ marginBottom: 12 }} onClick={onBack}>
        ← بازگشت
      </button>

      <div className="card">
        <h3>{task.title}</h3>
        <p style={{ color: '#64748b', marginTop: 6 }}>
          {task.grade.name} • مهلت: {new Date(task.deadline).toLocaleString('fa-IR')}
        </p>
      </div>

      {!data && <p>در حال بارگذاری...</p>}
      {data && data.submissions?.length === 0 && <p>ارسالی نیست.</p>}

      {data && data.submissions?.map((s) => (
        <div key={s.id} className="submission">
          <h3>👨‍🎓 {s.student.name}</h3>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            زمان: {new Date(s.submittedAt).toLocaleString('fa-IR')}
          </p>
          <img src={s.imageUrl} alt="ارسال" loading="lazy" />

          {s.score != null && (
            <div style={{ marginTop: 10, padding: 10, background: '#f0fdf4', borderRadius: 10 }}>
              <p style={{ fontWeight: 700, color: '#166534' }}>
                ✅ نمره: {s.score} / ۱۰۰
              </p>
              {s.feedback && (
                <p style={{ marginTop: 4, fontSize: 14, color: '#166534' }}>
                  💬 {s.feedback}
                </p>
              )}
            </div>
          )}

          <GradeEditor submission={s} onSaved={load} />
        </div>
      ))}
    </>
  );
}