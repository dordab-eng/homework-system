import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminDashboard() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState({});
  const [school, setSchool] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);

  async function load() {
    const [s, sc, t, tk, st] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/school'),
      api.get('/admin/teachers'),
      api.get('/admin/tasks'),
      api.get('/admin/students'),
    ]);
    setStats(s.data); setSchool(sc.data); setTeachers(t.data); setTasks(tk.data); setStudents(st.data);
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="topbar">
        <h2>🏫 {school?.name || 'پنل مدیر مدرسه'}</h2>
        <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => { localStorage.clear(); location.href = '/'; }}>خروج</button>
      </div>
      <nav className="tabs">
        {[['stats','📊 داشبورد'],['teachers','👨‍🏫 دبیران'],['students','👨‍🎓 دانش‌آموزان'],['tasks','📝 تکالیف']].map(([k,l]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      <div className="container">
        {tab === 'stats' && (
          <div className="grid">
            <div className="stat"><div className="num">{stats.teachers || 0}</div>دبیران</div>
            <div className="stat"><div className="num">{stats.students || 0}</div>دانش‌آموزان</div>
            <div className="stat"><div className="num">{stats.tasks || 0}</div>تکالیف</div>
            <div className="stat"><div className="num">{stats.submissions || 0}</div>ارسال‌ها</div>
          </div>
        )}
        {tab === 'teachers' && <TeachersTab teachers={teachers} school={school} onChange={load} />}
        {tab === 'students' && <StudentsTab students={students} school={school} />}
        {tab === 'tasks' && <TasksTab tasks={tasks} onChange={load} />}
      </div>
    </div>
  );
}

function TeachersTab({ teachers, school, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nationalId: '', password: '', gradeIds: [] });
  const grades = school?.grades.map((g) => g.grade) || [];
  function toggleGrade(id) {
    setForm((f) => ({ ...f, gradeIds: f.gradeIds.includes(id) ? f.gradeIds.filter((x) => x !== id) : [...f.gradeIds, id] }));
  }
  async function save() {
    if (!form.name || !form.nationalId || !form.password) return alert('اطلاعات ناقص');
    if (form.gradeIds.length === 0) return alert('حداقل یک پایه انتخاب کن');
    await api.post('/admin/teachers', form);
    setShowForm(false);
    setForm({ name: '', nationalId: '', password: '', gradeIds: [] });
    onChange();
  }
  async function removeFromSchool(id) {
    if (confirm('حذف دبیر از این مدرسه؟')) { await api.delete(`/admin/teachers/${id}/school`); onChange(); }
  }
  return (
    <>
      <button className="btn" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>
        {showForm ? 'بستن' : '+ افزودن دبیر به این مدرسه'}
      </button>
      {showForm && (
        <div className="card">
          <label>نام و نام خانوادگی</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>کد ملی</label>
          <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
          <label>رمز عبور</label>
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <label>پایه‌های تدریس</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {grades.map((g) => (
              <button key={g.id} type="button" className="btn secondary"
                style={{ width: 'auto', margin: 0, padding: '8px 14px', background: form.gradeIds.includes(g.id) ? '#6366f1' : undefined, color: form.gradeIds.includes(g.id) ? '#fff' : undefined }}
                onClick={() => toggleGrade(g.id)}>{g.name}</button>
            ))}
          </div>
          <button className="btn" onClick={save}>ذخیره</button>
        </div>
      )}
      {teachers.map((t) => (
        <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3>{t.name}</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>کد ملی: {t.nationalId}</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>پایه‌ها: {t.teacherAssignments.map((a) => a.grade.name).join('، ')}</p>
          </div>
          <button className="btn danger" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => removeFromSchool(t.id)}>حذف از مدرسه</button>
        </div>
      ))}
    </>
  );
}

function StudentsTab({ students, school }) {
  const [q, setQ] = useState('');
  const filtered = students.filter((s) => !q || s.name.includes(q));
  return (
    <>
      <div className="card">
        <input placeholder="جستجوی نام..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtered.map((s) => (
        <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3>{s.name}</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>{s.grade.name}</p>
          </div>
          <span className="badge ok">{s._count.submissions} ارسال</span>
        </div>
      ))}
    </>
  );
}

function TasksTab({ tasks, onChange }) {
  async function remove(id) {
    if (confirm('حذف تکلیف؟')) { await api.delete(`/admin/tasks/${id}`); onChange(); }
  }
  return (
    <>
      {tasks.map((t) => (
        <div key={t.id} className="task-card">
          <h3>{t.title}</h3>
          <p>{t.teacher.name} • {t.grade.name}</p>
          <p>مهلت: {new Date(t.deadline).toLocaleString('fa-IR')}</p>
          <p style={{ marginTop: 6 }}><span className="badge ok">{t._count.submissions} ارسال</span></p>
          <button className="btn danger" style={{ width: 'auto', marginTop: 10, padding: '8px 14px' }} onClick={() => remove(t.id)}>حذف تکلیف</button>
        </div>
      ))}
    </>
  );
}
