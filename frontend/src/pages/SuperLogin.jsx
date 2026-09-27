import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

export default function SuperLogin() {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function login() {
    try {
      const { data } = await api.post('/auth/super/login', { password });
      setToken(data.token);
      localStorage.setItem('role', 'super_admin');
      nav('/super');
    } catch (e) { setErr(e.response?.data?.error || 'خطا'); }
  }

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>🛡️ ورود مدیر کل</h2>
        <label>رمز عبور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
        {err && <p style={{ color: 'red', marginTop: 8 }}>{err}</p>}
        <button className="btn" onClick={login}>ورود</button>
      </div>
    </div>
  );
}
