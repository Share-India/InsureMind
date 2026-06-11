import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import Archive from './pages/Archive';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function App() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.key}>
      <Route path="/" element={<Login />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/archive" element={<Archive />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
