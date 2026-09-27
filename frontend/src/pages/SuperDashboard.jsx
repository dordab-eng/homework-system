import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function SuperDashboard() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState({});
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [teachers, setTeachers] = useState([]);

  async function load() {
    const [s, sc, g, t] = await Promise.all([
      api.get('/super/stats'),
      api.get('/super/schools'),
      api.get('/super/grades/all'),
      api.get('/super/teachers'),
    ]);
    setStats(s.data);
    setSchools(sc.data);
    setGrades(g.data);
    setTeachers(t.data);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="topbar">
        <h2>🛡️ پنل مدیر کل</h2>
        <button
          className="btn secondary"
          style={{ width: 'auto', margin: 0, padding: '8px 14px' }}
          onClick={() => { localStorage.clear(); location.href = '/'; }}
        >
          خروج
        </button>
      </div>

      <nav className="tabs">
        {[
          ['stats', '📊 داشبورد'],
          ['schools', '🏫 مدارس'],
          ['grades', '📚 پایه‌ها'],
          ['teachers', '👨‍🏫 دبیران'],
        ].map(([k, l]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </nav>

      <div className="container">
        {tab === 'stats' && (
          <div className="grid">
            <div className="stat"><div className="num">{stats.schools || 0}</div>مدارس</div>
            <div className="stat"><div className="num">{stats.admins || 0}</div>مدیران</div>
            <div className="stat"><div className="num">{stats.teachers || 0}</div>دبیران</div>
            <div className="stat"><div className="num">{stats.students || 0}</div>دانش‌آموزان</div>
            <div className="stat"><div className="num">{stats.tasks || 0}</div>تکالیف</div>
            <div className="stat"><div className="num">{stats.submissions || 0}</div>ارسال‌ها</div>
          </div>
        )}

        {tab === 'schools' && (
          <SchoolsTab schools={schools} grades={grades} onChange={load} />
        )}
        {tab === 'grades' && (
          <GradesTab grades={grades} onChange={load} />
        )}
        {tab === 'teachers' && (
          <TeachersTab teachers={teachers} schools={schools} onChange={load} />
        )}
      </div>
    </div>
  );
}

function SchoolsTab({ schools, grades, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', gradeIds: [],
    admin: { name: '', nationalId: '', password: '' },
  });

  function toggleGrade(id) {
    setForm((f) => ({
      ...f,
      gradeIds: f.gradeIds.includes(id)
        ? f.gradeIds.filter((x) => x !== id)
        : [...f.gradeIds, id],
    }));
  }

  async function save() {
    if (!form.name) return alert('نام مدرسه را وارد کنید');
    const { admin, ...school } = form;
    const { data: created } = await api.post('/super/schools', school);
    if (admin.name && admin.nationalId && admin.password) {
      await api.post(`/super/schools/${created.id}/admins`, admin);
    }
    setShowForm(false);
    setForm({
      name: '', code: '', gradeIds: [],
      admin: { name: '', nationalId: '', password: '' },
    });
    onChange();
  }

  async function remove(id) {
    if (confirm('حذف مدرسه و همه داده‌هایش؟')) {
      await api.delete(`/super/schools/${id}`);
      onChange();
    }
  }

  return (
    <>
      <button className="btn" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>
        {showForm ? 'بستن' : '+ افزودن مدرسه'}
      </button>

      {showForm && (
        <div className="card">
          <label>نام مدرسه</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

          <label>کد (اختیاری)</label>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />

          <label>پایه‌های فعال</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {grades.map((g) => (
              <button
                key={g.id}
                type="button"
                className="btn secondary"
                style={{
                  width: 'auto', margin: 0, padding: '8px 14px',
                  background: form.gradeIds.includes(g.id) ? '#6366f1' : undefined,
                  color: form.gradeIds.includes(g.id) ? '#fff' : undefined,
                }}
                onClick={() => toggleGrade(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: 20 }}>مدیر مدرسه (اختیاری)</h3>
          <label>نام مدیر</label>
          <input
            value={form.admin.name}
            onChange={(e) => setForm({ ...form, admin: { ...form.admin, name: e.target.value } })}
          />
          <label>کد ملی مدیر</label>
          <input
            value={form.admin.nationalId}
            onChange={(e) => setForm({ ...form, admin: { ...form.admin, nationalId: e.target.value } })}
          />
          <label>رمز مدیر</label>
          <input
            value={form.admin.password}
            onChange={(e) => setForm({ ...form, admin: { ...form.admin, password: e.target.value } })}
          />

          <button className="btn" onClick={save}>ذخیره مدرسه</button>
        </div>
      )}

      {schools.map((s) => (
        <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3>{s.name}</h3>
            <p style={{ marginTop: 6, fontSize: 14 }}>
              <b>پایه‌ها:</b> {s.grades.map((g) => g.grade.name).join('، ') || '—'}
            </p>
            <p style={{ fontSize: 14 }}>
              <b>دبیران:</b> {s._count.assignments} | <b>تکالیف:</b> {s._count.tasks}
            </p>
            <p style={{ fontSize: 14 }}>
              <b>مدیران:</b> {s.admins.map((a) => a.name).join('، ') || 'تعیین نشده'}
            </p>
          </div>
          <button
            className="btn danger"
            style={{ width: 'auto', margin: 0, padding: '8px 14px' }}
            onClick={() => remove(s.id)}
          >
            حذف
          </button>
        </div>
      ))}
    </>
  );
}

function GradesTab({ grades, onChange }) {
  const [name, setName] = useState('');
  const [order, setOrder] = useState(0);

  async function add() {
    if (!name) return;
    await api.post('/super/grades', { name, order: Number(order) });
    setName('');
    setOrder(0);
    onChange();
  }

  return (
    <>
      <div className="card">
        <label>نام پایه</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً: دهم ریاضی"
        />
        <label>ترتیب نمایش</label>
        <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
        <button className="btn" onClick={add}>افزودن پایه</button>
      </div>

      {grades.map((g) => (
        <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{g.name} (ترتیب: {g.order})</span>
        </div>
      ))}
    </>
  );
}

function TeachersTab({ teachers, schools, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nationalId: '', password: '', assignments: [] });
  const [sel, setSel] = useState({ schoolId: '', gradeId: '' });

  const selectedSchool = schools.find((s) => s.id === sel.schoolId);
  const availableGrades = (selectedSchool?.grades || []).map((sg) => ({
    id: sg.grade?.id || sg.gradeId,
    name: sg.grade?.name || '—',
  }));

  function addAssignment() {
    if (!sel.schoolId || !sel.gradeId) return alert('مدرسه و پایه را انتخاب کنید');
    const exists = form.assignments.some(
      (a) => a.schoolId === sel.schoolId && a.gradeId === sel.gradeId
    );
    if (exists) return alert('قبلاً اضافه شده');
    setForm({ ...form, assignments: [...form.assignments, sel] });
    setSel({ schoolId: '', gradeId: '' });
  }

  async function save() {
    if (!form.name || !form.nationalId || !form.password)
      return alert('اطلاعات ناقص است');
    if (form.assignments.length === 0)
      return alert('حداقل یک مدرسه/پایه اضافه کنید');

    try {
      await api.post('/super/teachers', form);
      setShowForm(false);
      setForm({ name: '', nationalId: '', password: '', assignments: [] });
      setSel({ schoolId: '', gradeId: '' });
      onChange();
    } catch (e) {
      alert('خطا: ' + (e.response?.data?.error || e.message));
    }
  }

  async function remove(id) {
    if (confirm('حذف دبیر؟')) {
      await api.delete(`/super/teachers/${id}`);
      onChange();
    }
  }

  return (
    <>
      <button className="btn" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>
        {showForm ? 'بستن' : '+ افزودن دبیر'}
      </button>

      {showForm && (
        <div className="card">
          <label>نام و نام خانوادگی</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

          <label>کد ملی</label>
          <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />

          <label>رمز عبور</label>
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

          <label>اختصاص مدرسه / پایه</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={sel.schoolId}
              onChange={(e) => setSel({ schoolId: e.target.value, gradeId: '' })}
              style={{ flex: 1, minWidth: 160 }}
            >
              <option value="">انتخاب مدرسه</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={sel.gradeId}
              onChange={(e) => setSel({ ...sel, gradeId: e.target.value })}
              style={{ flex: 1, minWidth: 130 }}
              disabled={!sel.schoolId}
            >
              <option value="">
                {!sel.schoolId
                  ? 'اول مدرسه را انتخاب کنید'
                  : availableGrades.length === 0
                  ? 'هیچ پایه‌ای فعال نیست'
                  : 'انتخاب پایه'}
              </option>
              {availableGrades.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <button
              className="btn secondary"
              style={{ width: 'auto', margin: 0 }}
              onClick={addAssignment}
              disabled={!sel.schoolId || !sel.gradeId}
            >
              افزودن
            </button>
          </div>

          <ul style={{ marginTop: 12, paddingRight: 20 }}>
            {form.assignments.map((a, i) => {
              const sc = schools.find((s) => s.id === a.schoolId);
              const sg = sc?.grades.find((g) => (g.grade?.id || g.gradeId) === a.gradeId);
              return (
                <li key={i}>
                  {sc?.name} → {sg?.grade?.name || '—'}
                </li>
              );
            })}
          </ul>

          <button className="btn" onClick={save}>ذخیره دبیر</button>
        </div>
      )}

      {teachers.map((t) => (
        <div key={t.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3>{t.name}</h3>
              <p style={{ color: '#64748b', fontSize: 13 }}>کد ملی: {t.nationalId}</p>
              <div style={{ marginTop: 8 }}>
                {t.teacherAssignments?.map((a, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      marginLeft: 8,
                      marginTop: 4,
                      padding: '4px 10px',
                      background: '#eef2ff',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    {a.school?.name} • {a.grade?.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              className="btn danger"
              style={{ width: 'auto', margin: 0, padding: '8px 14px' }}
              onClick={() => remove(t.id)}
            >
              حذف
            </button>
          </div>
        </div>
      ))}
    </>
  );
}