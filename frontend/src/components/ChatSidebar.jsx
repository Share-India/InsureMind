import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, FileText, Clock, ShieldAlert, Archive, UploadCloud, HelpCircle, User, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import insureMindLogo from '../../InsureMind.png';

const ChatSidebar = ({ uploadedFiles = [] }) => {
  const navigate = useNavigate();

  return (
    <aside className="app-sidebar chat-sidebar">

      <nav className="sidebar-nav clean">
        <NavLink to="/upload" className="nav-item active-light">
          <FileText size={18} color="#0f766e" />
          <span style={{ color: '#111827', fontWeight: 500 }}>Documents</span>
        </NavLink>
        <NavLink to="/archive" className="nav-item">
          <Archive size={18} />
          <span>Archive</span>
        </NavLink>
      </nav>

      <div className="active-policies-section">
        <h4 className="section-title">ACTIVE DOCUMENTS</h4>
        <div className="policy-list">
          {uploadedFiles.length > 0 ? (
            uploadedFiles.map((file, idx) => (
              <div key={idx} className="policy-item">
                <div className={`file-icon-small ${idx % 2 === 0 ? 'pdf-red' : 'pdf-blue'}`}>PDF</div>
                <span title={file.name} style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </span>
              </div>
            ))
          ) : (
            <div className="policy-item" style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
              No active policies loaded.
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-bottom">
        <button className="btn-primary btn-full mb-4" onClick={() => navigate('/upload')}>
          <UploadCloud size={18} style={{ marginRight: '8px' }} /> Upload Document
        </button>
        <button 
          className="logout-btn" 
          onClick={async () => {
            await supabase.auth.signOut();
            localStorage.removeItem('userName');
            navigate('/');
          }}
          style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
        >
          <LogOut size={18} color="#dc2626" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default ChatSidebar;
