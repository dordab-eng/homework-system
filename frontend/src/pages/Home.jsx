import { useNavigate } from 'react-router-dom';

export default function Home() {
  const nav = useNavigate();
  return (
    <div className="home">
      <h1>سامانه مدیریت و ارسال تکالیف</h1>
      <div className="roles">
        <button className="role-btn" onClick={() => nav('/student/login')}>
          <span className="emoji">👨‍🎓</span> ورود دانش‌آموز
        </button>
        <button className="role-btn" onClick={() => nav('/teacher/login')}>
          <span className="emoji">👨‍🏫</span> ورود دبیر
        </button>
        <button className="role-btn" onClick={() => nav('/admin/login')}>
          <span className="emoji">🏫</span> ورود مدیر مدرسه
        </button>
        <button className="role-btn" style={{ borderColor: '#cbd5e1', fontSize: 15 }} onClick={() => nav('/super/login')}>
          <span className="emoji">🛡️</span> ورود مدیر کل
        </button>
      </div>
    </div>
  );
}
