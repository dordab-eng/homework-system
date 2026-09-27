import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function PublicTask() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get(`/public/share/${slug}`).then((r) => setData(r.data)).catch((e) => setErr(e.response?.data?.error || 'خطا'));
  }, [slug]);
  if (err) return <div className="container" style={{ marginTop: 60, textAlign: 'center' }}><h2>❌ {err}</h2></div>;
  if (!data) return <div className="container" style={{ marginTop: 60 }}>در حال بارگذاری...</div>;
  return (
    <div className="container" style={{ marginTop: 40, maxWidth: 600 }}>
      <div className="card">
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>{data.title}</h1>
        <p style={{ color: '#475569', lineHeight: 1.9, marginBottom: 16 }}>{data.description}</p>
        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12 }}>
          <p><b>دبیر:</b> {data.teacher}</p>
          <p style={{ marginTop: 6 }}><b>مدرسه:</b> {data.school}</p>
          <p style={{ marginTop: 6 }}><b>پایه:</b> {data.grade}</p>
          <p style={{ marginTop: 6 }}><b>مهلت:</b> {new Date(data.deadline).toLocaleString('fa-IR')}</p>
        </div>
      </div>
    </div>
  );
}
