import React, { useState, useEffect } from 'react';
import ChatSidebar from '../components/ChatSidebar';
import insureMindLogo from '../../InsureMind.png';
import shareIndiaLogo from '../../SHAREINDIA.png';
import { Download, Trash2, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Archive = () => {
  const [archivedInsights, setArchivedInsights] = useState([]);
  const userName = localStorage.getItem('userName') || 'Demo User';

  useEffect(() => {
    const loadArchives = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data, error } = await supabase
          .from('archived_insights')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setArchivedInsights(data);
        }
      }
    };
    loadArchives();
  }, []);

  const removeArchive = async (id) => {
    await supabase.from('archived_insights').delete().eq('id', id);
    setArchivedInsights(archivedInsights.filter(item => item.id !== id));
  };

  return (
    <div className="app-layout" style={{ flexDirection: 'column' }}>
      {/* Topbar */}
      <header className="topbar bg-white" style={{ width: '100%', borderBottom: '1px solid #e2e8f0', zIndex: 50 }}>
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div className="topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 'auto', marginLeft: '-0.5rem' }}>
            <div style={{
              backgroundColor: '#344588',
              border: '1px solid #5465a6',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(52, 69, 136, 0.3)',
              width: '36px',
              height: '36px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <img src={insureMindLogo} alt="InsureMind Logo" style={{ 
                height: '26px', 
                maxWidth: 'none',
                position: 'absolute',
                left: '-9px',
                top: '50%',
                transform: 'translateY(-50%)',
                filter: 'brightness(0) invert(1) drop-shadow(0px 1px 2px rgba(0,0,0,0.15))' 
              }} />
            </div>
            <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 700, color: 'var(--dark-accent)', letterSpacing: '-0.5px' }}>InsureMind</h2>
          </div>
        </div>
        <div className="topbar-right">
          <div className="client-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '1.5rem', marginRight: '0.5rem', borderRight: '1px solid #e2e8f0' }}>
            <img src={shareIndiaLogo} alt="Share India" style={{ height: '28px' }} />
            <span style={{ fontWeight: 600, color: 'var(--dark-accent)', fontSize: '0.9rem' }}>Share India</span>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
            {userName}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ChatSidebar />
        
        <main className="main-content" style={{ padding: '2rem', background: '#f8fafc', overflowY: 'auto' }}>
          <div className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Archived Insights</h1>
              <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Saved analysis and critical clauses from your documents</p>
            </div>
            {archivedInsights.length > 0 && (
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Download size={18} />
                Export as PDF Report
              </button>
            )}
          </div>

          <div className="insights-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {archivedInsights.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No insights have been archived yet.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>Click "Save to Archive" on any AI response in the chat to save it here.</p>
              </div>
            ) : (
              archivedInsights.map(item => (
                <div key={item.id} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {item.document}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '1rem' }}>Saved on {item.date}</span>
                    </div>
                    <button onClick={() => removeArchive(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', marginBottom: '0.5rem' }}>Q: {item.query}</h4>
                    <p style={{ color: '#334155', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{item.response}</p>
                  </div>

                  {item.sources && item.sources.length > 0 && (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {item.sources.map((src, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                          <FileText size={14} color="#0f766e" />
                          <span style={{ color: '#0f172a', fontWeight: 500 }}>Pg {src.page_number}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Archive;
