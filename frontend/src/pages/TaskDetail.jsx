import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function TaskDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [task, setTask] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const inputRef = useRef();

  async function load() {
    const { data } = await api.get('/student/tasks');
    setTask(data.find((x) => x.id === id));
  }
  useEffect(() => { load(); }, [id]);

  if (!task) return <div className="container" style={{ marginTop: 40 }}>در حال بارگذاری...</div>;
  const submitted = task.submissions[0];
  const expired = new Date(task.deadline) < new Date();

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function send() {
    if (!file) return alert('عکس را انتخاب کنید');
    setSending(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(`/student/tasks/${task.id}/submit`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg('✅ ارسال شد');
      setFile(null); setPreview(null);
      await load();
    } catch (e) {
      setMsg(e.response?.data?.error || 'خطا');
    } finally { setSending(false); }
  }

  return (
    <div>
      <div className="topbar">
        <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => nav('/student')}>← بازگشت</button>
        <h2>جزئیات تکلیف</h2>
      </div>
      <div className="container">
        <div className="card">
          <h2>{task.title}</h2>
          <p style={{ marginTop: 8 }}><b>دبیر:</b> {task.teacher.name}</p>
          <p><b>مدرسه:</b> {task.school.name}</p>
          <p><b>پایه:</b> {task.grade.name}</p>
          <p style={{ marginTop: 8 }}><b>توضیحات:</b> {task.description}</p>
          <p style={{ marginTop: 8 }}><b>مهلت:</b> {new Date(task.deadline).toLocaleString('fa-IR')}</p>
        </div>

        {submitted && !file && (
          <div className="card" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
            <p style={{ color: '#166534', fontWeight: 600 }}>✅ ارسال شده</p>
            <img src={submitted.imageUrl} alt="ارسال" style={{ width: '100%', borderRadius: 12, marginTop: 10 }} />
            {submitted.score != null && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontWeight: 700, color: '#166534' }}>نمره: {submitted.score} / ۱۰۰</p>
                {submitted.feedback && <p style={{ marginTop: 6, color: '#166534' }}>💬 {submitted.feedback}</p>}
              </div>
            )}
          </div>
        )}

        {!expired && (
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>📸 ارسال تکلیف</h3>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFile} />
            <button className="btn" onClick={() => inputRef.current.click()}>انتخاب عکس از گالری / دوربین</button>
            {preview && (
              <div style={{ marginTop: 16 }}>
                <img src={preview} alt="پیش‌نمایش" style={{ width: '100%', borderRadius: 12, maxHeight: 400, objectFit: 'contain' }} />
                <button className="btn" disabled={sending} onClick={send}>
                  {sending ? 'در حال ارسال...' : '✅ ثبت و ارسال'}
                </button>
              </div>
            )}
            {msg && <p style={{ marginTop: 10, color: msg.startsWith('✅') ? 'green' : 'red' }}>{msg}</p>}
          </div>
        )}

        {expired && !submitted && (
          <div className="card" style={{ background: '#fef2f2' }}>
            <p style={{ color: '#991b1b' }}>⏰ مهلت تمام شده</p>
          </div>
        )}
      </div>
    </div>
  );
}
