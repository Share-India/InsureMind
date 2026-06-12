import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { CloudUpload, X, CheckCircle, Circle, BarChart2, Search, Loader2, Menu } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import shareIndiaLogo from '../../SHAREINDIA.png';
import insureMindLogo from '../../InsureMind.png';

const Upload = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [userName, setUserName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setUserName(localStorage.getItem('userName') || 'Demo User');
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      // Create an array of file objects with simulated progress
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        progress: 0,
        status: 'uploading'
      }));
      setFiles([...files, ...newFiles]);
      simulateUpload(newFiles);
    }
  };

  const simulateUpload = async (newFiles) => {
    setUploading(true);
    
    const formData = new FormData();
    newFiles.forEach(f => formData.append('files', f.file));
    
    try {
      await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setFiles(prev => prev.map(f => {
            if (newFiles.find(nf => nf.name === f.name)) {
              return { ...f, progress: percentCompleted, status: percentCompleted === 100 ? 'complete' : 'uploading' };
            }
            return f;
          }));
        }
      });
      
      // Save to chatHistory in Supabase on success
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        for (const file of newFiles) {
          await supabase.from('chat_sessions').insert({
            user_id: userData.user.id,
            session_name: file.name
          });
        }
      }
      window.dispatchEvent(new Event('chatHistoryUpdated'));
      
    } catch (err) {
      console.error("Upload failed", err);
      setFiles(prev => prev.map(f => {
        if (newFiles.find(nf => nf.name === f.name)) {
          return { ...f, status: 'error', progress: 0 };
        }
        return f;
      }));
      alert("Upload failed. Please ensure the backend is running on port 8000.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (name) => {
    setFiles(files.filter(f => f.name !== name));
  };

  return (
    <div className="app-layout" style={{ flexDirection: 'column' }}>
      {/* Topbar spanning full width */}
      <header className="topbar bg-white" style={{ width: '100%', borderBottom: '1px solid #e2e8f0', zIndex: 50 }}>
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
              <Menu size={24} color="var(--text-main)" />
            </button>
            <div className="topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 'auto', marginLeft: '-0.5rem' }}>
              <div style={{
                backgroundColor: '#546edb',
                border: '1px solid #7a91ef',
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
                  height: '38px', 
                  maxWidth: 'none',
                  position: 'absolute',
                  left: '-18px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  filter: 'brightness(0) invert(1) drop-shadow(0px 1px 2px rgba(0,0,0,0.15))' 
                }} />
              </div>
              <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 700, color: 'var(--dark-accent)', letterSpacing: '-0.5px' }}>InsureMind</h2>
            </div>
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
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Backdrop for mobile drawer */}
        {isSidebarOpen && (
          <div 
            className="sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
          />
        )}
        <div className={`sidebar-wrapper ${isSidebarOpen ? 'mobile-drawer-open' : ''}`}>
          <Sidebar />
        </div>
        
        <div className="main-wrapper">
          <div className="content-grid">
            {/* Main Content Area */}
          <div className="center-panel">
            <div className="breadcrumbs" style={{ marginBottom: '1rem' }}>
              Documents &gt; <strong>Document Upload</strong>
            </div>
            
            <h1 className="page-title">Insurance Document Ingestion</h1>
            <p className="page-subtitle">
              Securely upload your insurance policies, claim forms, or any related documents for deep AI-driven analysis. We support PDF, DOCX, and high-resolution scanned images.
            </p>

            <div className="dropzone-card" onClick={() => document.getElementById('file-upload').click()} style={{ cursor: 'pointer' }}>
              <div className="dropzone-icon-large">
                <CloudUpload size={32} color="#0f766e" />
              </div>
              <h2>Drop your documents here</h2>
              <p>Drag and drop your PDF here or click anywhere to browse your files.</p>
              <input 
                id="file-upload" 
                type="file" 
                multiple 
                accept=".pdf"
                style={{ display: 'none' }} 
                onChange={handleFileChange}
              />
              
              <div className="security-note">
                <span>🔒 256-bit AES Encrypted</span>
                <span className="dot">•</span>
                <span>Max file size: 50MB</span>
              </div>
            </div>

            {files.length > 0 && (
              <div className="active-uploads">
                <div className="uploads-header">
                  <h3>Active Uploads</h3>
                  <span className="badge-light">{files.length} Files</span>
                </div>
                
                <div className="upload-list">
                  {files.map((file, i) => (
                    <div key={i} className="upload-item">
                      <div className="file-icon pdf">PDF</div>
                      <div className="file-details">
                        <div className="file-name-row">
                          <span className="file-name">{file.name}</span>
                          <span className="file-percent">{file.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${file.progress}%` }}></div>
                        </div>
                        <span className="file-meta">
                          {file.size} • {file.progress === 100 ? 'Processing complete' : 'Processing structural integrity...'}
                        </span>
                      </div>
                      <button className="icon-btn" onClick={() => removeFile(file.name)}>
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button className="btn-secondary" onClick={() => setFiles([])}>Cancel All</button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="right-panel">
            <div className="guardian-tip">
              <div className="tip-icon">✨</div>
              <h3>Guardian Tip</h3>
              <p>Our AI can automatically detect conflicting coverage across multiple policies. Uploading all related documents at once yields the most accurate risk assessment.</p>
              <div className="quote">
                <div className="quote-avatar"></div>
                <i>"Trust is verified through transparent data."</i>
              </div>
            </div>

            <div className="verification-card">
              <h3>{files.length > 0 ? "Document Processing Status" : "Verification Protocol"}</h3>
              <div className="protocol-list">
                <div className="protocol-item">
                  {files.length > 0 && uploading ? (
                    <Loader2 size={18} color="#0f766e" className="animate-spin" />
                  ) : files.length > 0 && !uploading && files.every(f => f.status === 'complete') ? (
                    <CheckCircle size={18} color="#0f766e" />
                  ) : (
                    <Circle size={18} color="#d1d5db" />
                  )}
                  <div>
                    <h4>1. Secure Upload & Storage</h4>
                    <span>{files.length > 0 && uploading ? 'Transferring encrypted payload...' : files.length > 0 && files.every(f => f.status === 'complete') ? 'Payload secured' : 'Waiting for document'}</span>
                  </div>
                </div>
                <div className="protocol-item">
                  {files.length > 0 && uploading && files.some(f => f.progress === 100) ? (
                    <Loader2 size={18} color="#0f766e" className="animate-spin" />
                  ) : files.length > 0 && !uploading && files.every(f => f.status === 'complete') ? (
                    <CheckCircle size={18} color="#0f766e" />
                  ) : (
                    <Circle size={18} color="#d1d5db" />
                  )}
                  <div>
                    <h4>2. Text Extraction & Chunking</h4>
                    <span>{files.length > 0 && uploading && files.some(f => f.progress === 100) ? 'Parsing document structure...' : files.length > 0 && files.every(f => f.status === 'complete') ? 'Data chunks extracted' : 'Pending upload completion'}</span>
                  </div>
                </div>
                <div className="protocol-item">
                  {files.length > 0 && !uploading && files.every(f => f.status === 'complete') ? (
                    <CheckCircle size={18} color="#0f766e" />
                  ) : (
                    <Circle size={18} color="#d1d5db" />
                  )}
                  <div>
                    <h4>3. AI Vectorization</h4>
                    <span>{files.length > 0 && !uploading && files.every(f => f.status === 'complete') ? 'Ready for semantic analysis' : 'Pending chunk extraction'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ position: 'sticky', bottom: '-2rem', background: 'var(--bg-light)', padding: '1rem 0 2rem 0', marginTop: 'auto', zIndex: 10 }}>
              <button 
                className="btn-primary btn-large btn-full mt-4" 
                style={{ margin: 0 }}
                onClick={() => navigate('/chat', { state: { files: files } })}
                disabled={files.length === 0 || files.some(f => f.progress < 100)}
              >
                Analyze Documents <BarChart2 size={18} style={{ marginLeft: '8px' }}/>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Upload;
