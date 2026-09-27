import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import SuperLogin from './pages/SuperLogin.jsx';
import SuperDashboard from './pages/SuperDashboard.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import TeacherLogin from './pages/TeacherLogin.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import StudentLogin from './pages/StudentLogin.jsx';
import StudentHome from './pages/StudentHome.jsx';
import StudentReport from './pages/StudentReport.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import PublicTask from './pages/PublicTask.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/super/login" element={<SuperLogin />} />
      <Route path="/super/*" element={<SuperDashboard />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="/teacher/login" element={<TeacherLogin />} />
      <Route path="/teacher/*" element={<TeacherDashboard />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student" element={<StudentHome />} />
      <Route path="/student/report" element={<StudentReport />} />
      <Route path="/student/task/:id" element={<TaskDetail />} />
      <Route path="/share/:slug" element={<PublicTask />} />
    </Routes>
  );
}
