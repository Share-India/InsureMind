import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, LayoutGrid, FileText, Activity, ShieldCheck, HelpCircle, LogOut, UploadCloud, MessageSquare, Clock } from 'lucide-react';
import insureMindLogo from '../../InsureMind.png';
import { supabase } from '../supabaseClient';

const Sidebar = () => {
  const navigate = useNavigate();
  const [recentChats, setRecentChats] = useState([]);

  useEffect(() => {
    const loadChats = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setRecentChats(data.map(session => ({ id: session.id, name: session.session_name, date: session.created_at })));
        }
      }
    };
    loadChats();
    window.addEventListener('chatHistoryUpdated', loadChats);
    window.addEventListener('storage', loadChats);
    return () => {
      window.removeEventListener('chatHistoryUpdated', loadChats);
      window.removeEventListener('storage', loadChats);
    };
  }, []);

  return (
    <aside className="app-sidebar">

      <nav className="sidebar-nav">
        <NavLink to="/upload" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={(e) => {
          if (window.location.pathname === '/upload') {
            e.preventDefault();
            const fileInput = document.getElementById('file-upload');
            if (fileInput) fileInput.click();
          }
        }}>
          <UploadCloud size={18} />
          <span>Upload Document</span>
        </NavLink>
      </nav>

      <div className="recent-chats-section" style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '0 1.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          RECENT CHATS
        </div>
        {recentChats.length > 0 ? (
          recentChats.map((chat, idx) => (
            <div key={idx} className="nav-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/chat', { state: { files: [{ name: chat.name }], sessionId: chat.id } })}>
              <MessageSquare size={16} />
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                {chat.name}
              </span>
            </div>
          ))
        ) : (
          <div style={{ padding: '0 1.5rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
            No recent chats found.
          </div>
        )}
      </div>

      <div className="sidebar-bottom">
        <button className="logout-btn" onClick={() => navigate('/')}>
          <LogOut size={18} color="#dc2626" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
