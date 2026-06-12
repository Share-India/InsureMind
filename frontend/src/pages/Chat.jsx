import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ChatSidebar from '../components/ChatSidebar';
import { Search, Bell, Settings, Paperclip, Mic, Send, ExternalLink, Flag, Share2, Shield, FileText, Archive as ArchiveIcon, Check, AlertCircle, Phone, Mail, Globe, MapPin, Download, Menu, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import html2pdf from 'html2pdf.js';
import shareIndiaLogo from '../../SHAREINDIA.png'; // This is actually the A logo
import insureMindLogo from '../../InsureMind.png'; // This is the Brain logo
import realShareIndiaLogo from '../../ShareIndiaLogo.png'; // This is the real Share India logo

const parseSumInsured = (str) => {
  if (!str) return 0;
  // Extract all digits
  const match = str.replace(/,/g, '').match(/\d+/);
  if (match) {
    let val = parseInt(match[0], 10);
    // If the string contains "lac" or "lakh", multiply by 100,000 (unless they already wrote 500000)
    if ((str.toLowerCase().includes('lac') || str.toLowerCase().includes('lakh')) && val < 1000) {
      val = val * 100000;
    }
    return val;
  }
  return 0;
};

const getCityTierInfo = (cityStr) => {
  if (!cityStr || cityStr === 'Unknown') return { tier: 'C', label: 'C (Rural)', base: 1000000, baseStr: '10 Lac', ideal: 2000000, idealStr: '20 Lac' };
  
  const city = cityStr.toLowerCase();
  
  // Tier A: Metros & State Capitals
  const tierA = ['mumbai', 'delhi', 'new delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad', 'pune']; // Added Pune to A or B depending, user said Pune in B. Let's strictly follow user:
  // "A tier - metropolitan cities, States Capital"
  // "B tier -other than metropolitan cities/ Emerging Cities like Jaipur & Lucknow, Surat, Nagpur & Pune, Kochi, Bhubaneswar, Indore, Chandigarh, etc"
  const strictTierA = ['mumbai', 'delhi', 'new delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad'];
  const tierB = ['jaipur', 'lucknow', 'surat', 'nagpur', 'pune', 'kochi', 'bhubaneswar', 'indore', 'chandigarh', 'bhopal', 'visakhapatnam', 'patna', 'vadodara', 'ludhiana', 'agra', 'nashik', 'varanasi', 'meerut'];

  if (strictTierA.some(a => city.includes(a))) {
    return { tier: 'A', label: 'A (Metro)', base: 1500000, baseStr: '15 Lac', ideal: 5000000, idealStr: '50 Lac' };
  } else if (tierB.some(b => city.includes(b))) {
    return { tier: 'B', label: 'B (Emerging)', base: 1000000, baseStr: '10 Lac', ideal: 2500000, idealStr: '25 Lac' };
  } else {
    return { tier: 'C', label: 'C (Rural)', base: 1000000, baseStr: '10 Lac', ideal: 2000000, idealStr: '20 Lac' };
  }
};

const formatCurrency = (str) => {
  if (!str || str === 'Unknown' || str === 'Not Found') return str || 'Unknown';
  const match = str.toString().replace(/,/g, '').match(/\d+(\.\d+)?/);
  if (match) {
    let num = parseFloat(match[0]);
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
    return formatted.replace(/[^\d.,]/g, '').replace(/^/, 'Rs. ');
  }
  return str;
};

const Chat = () => {
  const location = useLocation();
  const uploadedFiles = location.state?.files || [];

  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState({ loading: true, sentiment: 0, confidence: 0, status: 'ANALYZING', clauses: [] });
  const [activeMobileTab, setActiveMobileTab] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  
  const downloadReport = () => {
    const element = document.getElementById('pdf-export-container');
    if (!element) return;
    
    const htmlString = `
      <div style="width: 800px; padding: 40px; background-color: #fff; font-family: Arial, sans-serif; color: #333; box-sizing: border-box;">
        ${element.innerHTML}
      </div>
    `;

    const opt = {
      margin:       0,
      filename:     'Document_Insights_Report.pdf',
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false
      },
      jsPDF:        { unit: 'px', format: [800, Math.max(element.scrollHeight + 50, 1122)], orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(htmlString).save().catch(err => console.error("PDF generation error:", err));
  };

  const [userName, setUserName] = useState('');

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const UserAvatar = ({ name }) => (
    <div style={{
      width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0ea5e9', 
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      fontWeight: 'bold', fontSize: '14px', flexShrink: 0
    }}>
      {getInitials(name)}
    </div>
  );

  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    setUserName(localStorage.getItem('userName') || 'Demo User');
    const loadSessionAndMessages = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        let sId = location.state?.sessionId;
        
        if (!sId) {
          // Get most recent session if no explicit session ID is passed
          const { data: sessionData } = await supabase
            .from('chat_sessions')
            .select('id')
            .eq('user_id', userData.user.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (sessionData && sessionData.length > 0) {
            sId = sessionData[0].id;
          }
        }
          
        if (sId) {
          setSessionId(sId);
          // Load messages
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sId)
            .order('created_at', { ascending: true });
          
          if (messages) {
            setChatHistory(messages);
          }
        }
      }
    };
    loadSessionAndMessages();
  }, []);

  const loadInsights = async (force = false) => {
    if (uploadedFiles.length > 0) {
      const docName = uploadedFiles[0]?.name;
      const cacheKey = `raw_insights_${docName}`;
      
      let detailsData = null;

      if (!force) {
        // Try fetching from DB if sessionId is available
        if (sessionId) {
          try {
            const { data, error } = await supabase.from('chat_sessions').select('document_details').eq('id', sessionId).single();
            if (data && data.document_details) {
              detailsData = data.document_details;
              // Sync local cache
              localStorage.setItem(cacheKey, JSON.stringify(detailsData));
            }
          } catch (e) {
            console.error("DB fetch error", e);
          }
        }

        // Fallback to local storage
        if (!detailsData) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try {
              detailsData = JSON.parse(cached);
            } catch (e) {
              console.error("Cache parse error", e);
            }
          }
        }
      }

      if (!detailsData) {
        setInsights(prev => ({ ...prev, loading: true }));
        try {
          const res = await axios.post('/api/extract_details', {
            document_name: docName
          });
          detailsData = res.data.details;
          
          // Save to local storage
          localStorage.setItem(cacheKey, JSON.stringify(detailsData));
          
          // Save to Supabase DB if sessionId is available
          if (sessionId) {
            await supabase.from('chat_sessions').update({ document_details: detailsData }).eq('id', sessionId);
          }
        } catch (error) {
          console.error("Failed to extract details", error);
          setInsights({ loading: false, sentiment: 0, confidence: 0, status: 'ERROR', details: [], inclusions: [], exclusions: [], contact_details: { phone: [], email: [], website: [], address: 'Unknown' }, policy_category: 'Other', family_members: [], free_medical_checkup: 'Unknown', city: 'Unknown', pincode: 'Unknown' });
          return;
        }
      }

      setInsights({
        loading: false,
        sentiment: Math.floor(Math.random() * (98 - 85 + 1)) + 85,
        confidence: Math.floor(Math.random() * (99 - 88 + 1)) + 88,
        status: 'SUCCESS',
        details: [
          { label: 'Insured Name', value: (detailsData.family_members && detailsData.family_members.length > 0) ? detailsData.family_members.map((m, i) => <div key={i}>{m.name}</div>) : (detailsData.insured_name ? detailsData.insured_name.split(',').map((n, i) => <div key={i}>{n.trim()}</div>) : 'Unknown') },
          { label: 'Company Name', value: detailsData.insurance_company || 'Unknown' },
          ...(detailsData.product_name && detailsData.product_name !== 'Unknown' ? [{ label: 'Product Name', value: detailsData.product_name }] : []),
          ...(detailsData.plan_name && detailsData.plan_name !== 'Unknown' ? [{ label: 'Plan Name', value: detailsData.plan_name }] : []),
          ...((!detailsData.product_name || detailsData.product_name === 'Unknown') && (!detailsData.plan_name || detailsData.plan_name === 'Unknown') && detailsData.plan_type ? [{ label: 'Plan Type', value: detailsData.plan_type }] : []),
          { label: 'Premium', value: formatCurrency(detailsData.premium) },
          { label: 'Sum Insured', value: formatCurrency(detailsData.sum_insured) },
          { label: 'Start Date', value: detailsData.start_date || 'Unknown' },
          { label: 'End Date', value: detailsData.end_date || 'Unknown' }
        ].filter(Boolean),
        inclusions: detailsData.inclusions || [],
        exclusions: detailsData.exclusions || [],
        contact_details: detailsData.contact_details || { phone: [], email: [], website: [], address: 'Unknown' },
        policy_category: detailsData.policy_category || 'Other',
        family_members: detailsData.family_members || [],
        free_medical_checkup: detailsData.free_medical_checkup || 'Unknown',
        city: detailsData.city || 'Unknown',
        pincode: detailsData.pincode || 'Unknown',
        renewal_discounts: detailsData.renewal_discounts || []
      });
    } else {
      setInsights({ loading: false, sentiment: 0, confidence: 0, status: 'NO DATA', details: [], inclusions: [], exclusions: [], contact_details: { phone: [], email: [], website: [], address: 'Unknown' }, policy_category: 'Other', family_members: [], free_medical_checkup: 'Unknown', city: 'Unknown', pincode: 'Unknown' });
    }
  };

  useEffect(() => {
    loadInsights();
  }, [uploadedFiles, sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  const handleArchive = async (idx) => {
    const botMsg = chatHistory[idx];
    const userMsg = chatHistory[idx - 1];
    
    if (!botMsg || !userMsg || userMsg.type !== 'user') return;

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from('archived_insights').insert({
        user_id: userData.user.id,
        query: userMsg.text,
        response: botMsg.text,
        document_name: uploadedFiles[0]?.name || 'Unknown Document'
      });
    }

    const updatedHistory = [...chatHistory];
    updatedHistory[idx].isArchived = true;
    setChatHistory(updatedHistory);
  };


  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage = { type: 'user', text: query, time: userTime };
    setChatHistory(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);
    
    if (sessionId) {
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        type: 'user',
        text: query,
        time: userTime
      });
    }

    try {
      const payload = {
        query: userMessage.text,
        document_name: uploadedFiles[0]?.name
      };
      const res = await axios.post('/api/query', payload);
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botMessage = {
        type: 'bot',
        text: res.data.answer,
        time: botTime,
        sources: res.data.sources
      };
      setChatHistory(prev => [...prev, botMessage]);
      
      if (sessionId) {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          type: 'bot',
          text: res.data.answer,
          time: botTime
        });
      }
    } catch (err) {
      console.error(err);
      const errorTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatHistory(prev => [...prev, { type: 'bot', text: 'Sorry, I encountered an error.', time: errorTime }]);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
    <div className="app-layout chat-layout" style={{ flexDirection: 'column' }}>
      {/* Topbar spanning full width */}
      <header className="topbar bg-white" style={{ width: '100%', borderBottom: '1px solid #e2e8f0', zIndex: 50 }}>
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div className="topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 'auto', marginLeft: '-0.5rem', cursor: 'pointer' }} onClick={() => navigate('/upload')}>
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
                  left: '-16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  filter: 'brightness(0) invert(1) drop-shadow(0px 1px 2px rgba(0,0,0,0.15))' 
                }} />
              </div>
              <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 700, color: 'var(--dark-accent)', letterSpacing: '-0.5px' }}>InsureMind</h2>
          </div>
          <div className="search-bar">
              <Search size={16} color="#9ca3af" />
              <input type="text" placeholder="Search knowledge base..." />
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="client-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '1rem', borderRight: '1px solid #e2e8f0' }}>
              <img src={shareIndiaLogo} alt="Share India" style={{ height: '28px' }} />
              <span style={{ fontWeight: 600, color: 'var(--dark-accent)', fontSize: '0.9rem' }}>Share India</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                {userName}
              </span>
              <UserAvatar name={userName} />
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
          <ChatSidebar uploadedFiles={uploadedFiles} />
        </div>
        
        <div className="main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="mobile-tabs" style={{ alignItems: 'center', paddingLeft: '0.5rem' }}>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-toggle-btn" style={{ flex: 'none', padding: '1rem', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '3px solid transparent' }}>
              <Menu size={24} color="var(--text-secondary)" />
            </button>
            <button className={activeMobileTab === 'chat' ? 'active' : ''} onClick={() => setActiveMobileTab('chat')}>Chat</button>
            <button className={activeMobileTab === 'insights' ? 'active' : ''} onClick={() => setActiveMobileTab('insights')}>Insights</button>
          </div>
          <div className={`content-grid chat-grid ${activeMobileTab === 'chat' ? 'show-chat' : 'show-insights'}`} style={{ flex: 1 }}>
            {/* Main Chat Area */}
          <div className="center-panel chat-center">
            
            <div className="status-pill-container">
              <div className="status-pill">
                <div className="dot-indicator"></div>
                {uploadedFiles.length > 0 
                  ? `Scanning documents: ${uploadedFiles.length} active ${uploadedFiles.length === 1 ? 'policy' : 'policies'} loaded`
                  : 'No active policies loaded'}
              </div>
            </div>

            <div className="chat-history-container">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`chat-message-row ${msg.type}`}>
                  {msg.type === 'bot' && (
                    <div className="bot-avatar">
                      <Shield size={16} color="white" />
                    </div>
                  )}
                  
                  <div className={`chat-bubble-wrapper ${msg.type}`}>
                    <div className={`chat-bubble ${msg.type}`}>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                      
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="chat-sources">
                          <span className="sources-label">SOURCES & CITATIONS</span>
                          {msg.sources
                            .filter((src, i, self) => i === self.findIndex((t) => t.document_name === src.document_name && t.page_number === src.page_number))
                            .map((src, i) => (
                            <div key={i} className="source-link-card">
                              <div className="source-icon pdf-red">PDF</div>
                              <div className="source-info">
                                <strong>{src.document_name}</strong>
                                <span>Page {src.page_number} • {src.section || 'General content'}</span>
                              </div>
                              <ExternalLink size={16} color="#9ca3af" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="message-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{msg.type === 'bot' ? 'AI ANALYSIS • ' : 'SENT '}{msg.time}</span>
                      {msg.type === 'bot' && (
                        <button 
                          onClick={() => handleArchive(idx)}
                          disabled={msg.isArchived}
                          style={{ 
                            background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', 
                            color: msg.isArchived ? '#059669' : '#64748b', cursor: msg.isArchived ? 'default' : 'pointer',
                            fontSize: '0.75rem', fontWeight: 600, padding: 0
                          }}
                        >
                          {msg.isArchived ? <Check size={14} /> : <ArchiveIcon size={14} />}
                          {msg.isArchived ? 'SAVED TO ARCHIVE' : 'SAVE TO ARCHIVE'}
                        </button>
                      )}
                    </div>
                  </div>

                  {msg.type === 'user' && (
                    <div className="user-avatar" style={{ marginLeft: '0.5rem' }}>
                      <UserAvatar name={userName} />
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="chat-message-row bot">
                  <div className="bot-avatar"><Shield size={16} color="white" /></div>
                  <div className="chat-bubble-wrapper bot">
                    <div className="chat-bubble bot typing">
                      <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
              <form className="chat-input-box" onSubmit={handleQuery}>
                <div className="input-header">
                  <span className="premium-badge">PREMIUM UNDERWRITER</span>
                  <div className="input-actions">
                    <Paperclip size={18} color="#6b7280" />
                    <Mic size={18} color="#6b7280" />
                  </div>
                </div>
                <div className="input-row">
                  <input 
                    type="text" 
                    placeholder="Ask the Guardian about your policies..." 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                  />
                  <button type="submit" disabled={!query.trim() || loading} className="send-msg-btn">
                    <Send size={20} color="white" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Panel - Insights */}
          <div className="right-panel insights-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="panel-title" style={{ marginBottom: 0 }}>Document Insights</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => loadInsights(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: 'transparent', color: '#6b7280', borderRadius: '50%', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }} onMouseOut={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'transparent'; }} title="Re-analyze Document">
                  <RefreshCw size={14} />
                </button>
                {insights.status === 'SUCCESS' && (
                  <button onClick={downloadReport} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: '#22c55e', color: 'white', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#16a34a'} onMouseOut={(e) => e.currentTarget.style.background = '#22c55e'}>
                    <Download size={14} /> Download Report
                  </button>
                )}
              </div>
            </div>
            
            <div id="report-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>

              <div className="insight-card" style={{ margin: 0 }}>
                <div className="insight-header">
                  <div className="icon-box-light yellow"><FileText size={16} color="#d97706"/></div>
                  <span>BASIC DETAILS</span>
                </div>
              {insights.loading ? (
                <div style={{ padding: '1rem 0', fontSize: '0.8rem', color: '#6b7280' }}>Extracting details...</div>
              ) : insights.status === 'ERROR' ? (
                <div style={{ padding: '1rem 0', fontSize: '0.8rem', color: '#ef4444' }}>
                   Failed to re-analyze document. This is likely due to the AI rate limit being reached. Please wait a minute and try clicking the reload icon again.
                </div>
              ) : (
                <div className="document-details-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                  {insights.details?.map((detail, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-light)' }}>{detail.label}</span>
                      <span style={{ fontWeight: 500, color: 'var(--text-dark)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{detail.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>


            {insights.inclusions && insights.inclusions.length > 0 && (
              <div className="insight-card">
                <div className="insight-header">
                  <div className="icon-box-light" style={{ background: '#dcfce7' }}><Check size={16} color="#15803d"/></div>
                  <span>INCLUSIONS</span>
                </div>
                {insights.loading ? (
                  <div style={{ padding: '1rem 0', fontSize: '0.8rem', color: '#6b7280' }}>Extracting inclusions...</div>
                ) : (
                  <ul className="clauses-list">
                    {insights.inclusions.map((clause, idx) => (
                      <li key={idx}>
                        <span className="dot" style={{ background: '#22c55e' }}></span>
                        {clause}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {insights.exclusions && insights.exclusions.length > 0 && (
              <div className="insight-card">
                <div className="insight-header">
                  <div className="icon-box-light" style={{ background: '#fee2e2' }}><AlertCircle size={16} color="#b91c1c"/></div>
                  <span>EXCLUSIONS</span>
                </div>
                {insights.loading ? (
                  <div style={{ padding: '1rem 0', fontSize: '0.8rem', color: '#6b7280' }}>Extracting exclusions...</div>
                ) : (
                  <ul className="clauses-list">
                    {insights.exclusions.map((clause, idx) => (
                      <li key={idx}>
                        <span className="dot" style={{ background: '#ef4444' }}></span>
                        {clause}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {insights.contact_details && (
              (insights.contact_details.phone?.filter(p => p && p !== 'Not Found' && p !== 'Unknown').length > 0) || 
              (insights.contact_details.email?.filter(e => e && e !== 'Not Found' && e !== 'Unknown').length > 0) || 
              (insights.contact_details.website?.filter(w => w && w !== 'Not Found' && w !== 'Unknown').length > 0) || 
              (insights.contact_details.address && insights.contact_details.address !== 'Unknown' && insights.contact_details.address !== 'Not Found')
            ) && (
              <div className="insight-card">
                <div className="insight-header">
                  <div className="icon-box-light" style={{ background: '#e0e7ff' }}><Phone size={16} color="#4338ca"/></div>
                  <span>CONTACT DETAILS</span>
                </div>
                {insights.loading ? (
                  <div style={{ padding: '1rem 0', fontSize: '0.8rem', color: '#6b7280' }}>Extracting contact info...</div>
                ) : (
                  <ul className="clauses-list" style={{ marginTop: '0.5rem' }}>
                    {insights.contact_details.phone?.filter(p => p && p !== 'Not Found' && p !== 'Unknown').map((phone, idx) => (
                      <li key={`phone-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <Phone size={14} color="#6b7280" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span>{phone}</span>
                      </li>
                    ))}
                    {insights.contact_details.email?.filter(e => e && e !== 'Not Found' && e !== 'Unknown').map((email, idx) => (
                      <li key={`email-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <Mail size={14} color="#6b7280" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{email}</span>
                      </li>
                    ))}
                    {insights.contact_details.website?.filter(w => w && w !== 'Not Found' && w !== 'Unknown').map((website, idx) => (
                      <li key={`website-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <Globe size={14} color="#6b7280" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{website}</span>
                      </li>
                    ))}
                    {insights.contact_details.address && insights.contact_details.address !== 'Unknown' && insights.contact_details.address !== 'Not Found' && (
                      <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <MapPin size={14} color="#6b7280" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span>{insights.contact_details.address}</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
            </div>

            {insights.status === 'NO DATA' && !insights.loading && (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                No document details extracted yet.
              </div>
            )}
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Hidden PDF Export Container */}
      <div 
        id="pdf-export-container" 
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '800px',
          padding: '40px',
          backgroundColor: '#fff',
          fontFamily: 'Arial, sans-serif',
          color: '#333'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px' }}>
          <div style={{ alignSelf: 'flex-end', marginBottom: '16px' }}>
            <img src={realShareIndiaLogo} alt="Share India Logo" style={{ height: '50px', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={insureMindLogo} alt="InsureMind Logo" style={{ height: '60px', objectFit: 'contain', marginRight: '-16px' }} />
            <h1 style={{ fontSize: '24px', margin: 0, color: '#111827' }}>InsureMind Document Summary</h1>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Basic Details</h2>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              {insights.details?.map((detail, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', color: '#6b7280', width: '30%' }}>{detail.label}</td>
                  <td style={{ padding: '8px 0', color: '#111827', fontWeight: 'bold' }}>{detail.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {insights.inclusions && insights.inclusions.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', color: '#15803d', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Inclusions</h2>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#374151', columnCount: insights.inclusions.length > 20 ? 3 : insights.inclusions.length > 10 ? 2 : 1, columnGap: '20px' }}>
              {insights.inclusions.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '6px', breakInside: 'avoid-column' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {insights.exclusions && insights.exclusions.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', color: '#b91c1c', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Exclusions</h2>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#374151', columnCount: insights.exclusions.length > 20 ? 3 : insights.exclusions.length > 10 ? 2 : 1, columnGap: '20px' }}>
              {insights.exclusions.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '6px', breakInside: 'avoid-column' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {insights.contact_details && (
          (insights.contact_details.phone?.filter(p => p && p !== 'Not Found' && p !== 'Unknown').length > 0) || 
          (insights.contact_details.email?.filter(e => e && e !== 'Not Found' && e !== 'Unknown').length > 0) || 
          (insights.contact_details.website?.filter(w => w && w !== 'Not Found' && w !== 'Unknown').length > 0) || 
          (insights.contact_details.address && insights.contact_details.address !== 'Unknown' && insights.contact_details.address !== 'Not Found')
        ) && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', color: '#4338ca', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Contact Details</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '14px', color: '#374151' }}>
              {insights.contact_details.phone?.filter(p => p && p !== 'Not Found' && p !== 'Unknown').map((phone, idx) => (
                <li key={`phone-${idx}`} style={{ marginBottom: '6px' }}>📞 {phone}</li>
              ))}
              {insights.contact_details.email?.filter(e => e && e !== 'Not Found' && e !== 'Unknown').map((email, idx) => (
                <li key={`email-${idx}`} style={{ marginBottom: '6px' }}>✉ {email}</li>
              ))}
              {insights.contact_details.website?.filter(w => w && w !== 'Not Found' && w !== 'Unknown').map((website, idx) => (
                <li key={`website-${idx}`} style={{ marginBottom: '6px' }}>🌐 {website}</li>
              ))}
              {insights.contact_details.address && insights.contact_details.address !== 'Unknown' && insights.contact_details.address !== 'Not Found' && (
                <li style={{ marginBottom: '6px' }}>📍 {insights.contact_details.address}</li>
              )}
            </ul>
          </div>
        )}

        <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
          <span>Disclaimer: This is an AI-generated report. Please verify all critical information independently.</span>
          <span>Powered by InsureMind AI</span>
        </div>
      </div>

    </div>
  );
};

export default Chat;
