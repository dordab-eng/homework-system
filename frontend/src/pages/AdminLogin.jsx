import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

export default function AdminLogin() {
  const nav = useNavigate();
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function login() {
    try {
      const { data } = await api.post('/auth/admin/login', { nationalId, password });
      setToken(data.token);
      localStorage.setItem('role', 'admin');
      nav('/admin');
    } catch (e) { setErr(e.response?.data?.error || 'خطا'); }
  }

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>🏫 ورود مدیر مدرسه</h2>
        <label>کد ملی</label>
        <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
        <label>رمز عبور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
        {err && <p style={{ color: 'red', marginTop: 8 }}>{err}</p>}
        <button className="btn" onClick={login}>ورود</button>
      </div>
    </div>
  );
}
