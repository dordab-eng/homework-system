import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

export default function StudentLogin() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/public/schools').then((r) => setSchools(r.data)).catch(() => setErr('خطا در اتصال به سرور'));
  }, []);

  const grades = useMemo(() => {
    const school = schools.find((s) => s.id === schoolId);
    return school?.grades || [];
  }, [schoolId, schools]);

  async function login() {
    try {
      const { data } = await api.post('/auth/student/login', { name, schoolId, gradeId });
      setToken(data.token);
      localStorage.setItem('role', 'student');
      nav('/student');
    } catch (e) { setErr(e.response?.data?.error || 'خطا'); }
  }

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>👨‍🎓 ورود دانش‌آموز</h2>
        <label>نام و نام خانوادگی</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>مدرسه</label>
        <select value={schoolId} onChange={(e) => { setSchoolId(e.target.value); setGradeId(''); }}>
          <option value="">انتخاب کنید</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label>پایه</label>
        <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} disabled={!schoolId}>
          <option value="">انتخاب کنید</option>
          {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {err && <p style={{ color: 'red', marginTop: 8 }}>{err}</p>}
        <button className="btn" onClick={login}>ورود</button>
      </div>
    </div>
  );
}
