import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import insureMindLogo from '../../InsureMind.png';
import realShareIndiaLogo from '../../ShareIndiaLogo.png';
import html2pdf from 'html2pdf.js';
import { Users, ChevronRight, ChevronDown, Activity, Shield, FileText, AlertTriangle, CheckCircle, LogOut, Download } from 'lucide-react';

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

const getInsightsObj = (detailsData) => {
  if (!detailsData) return {};
  return {
    details: [
      { label: 'Insured Name', value: (detailsData.family_members && detailsData.family_members.length > 0) ? detailsData.family_members.map(m => m.name).join(', ') : (detailsData.insured_name || 'Unknown') },
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
    contact_details: detailsData.contact_details || { phone: [], email: [], website: [], address: 'Unknown' }
  };
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSessionForPdf, setSelectedSessionForPdf] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== 'it.ins@shareindia.co.in') {
        navigate('/');
        return;
      }

      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        const { data: sessionsData, error: sessionsError } = await supabase
          .from('chat_sessions')
          .select('*')
          .order('created_at', { ascending: false });

        if (sessionsError) throw sessionsError;

        setUsers(profilesData || []);
        setSessions(sessionsData || []);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [navigate]);

  useEffect(() => {
    if (selectedSessionForPdf) {
      setTimeout(() => {
        downloadReport();
        setSelectedSessionForPdf(null);
      }, 300);
    }
  }, [selectedSessionForPdf]);

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
      filename:     'Admin_Document_Insights_Report.pdf',
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'px', format: [800, Math.max(element.scrollHeight + 50, 1122)], orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(htmlString).save().catch(err => console.error("PDF generation error:", err));
  };

  const toggleUserExpanded = (userId) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getUserSessions = (userId) => {
    return sessions.filter(s => s.user_id === userId);
  };

  const activeUsersCount = users.length;
  const totalPoliciesAnalyzed = sessions.length;
  
  const currentPdfData = selectedSessionForPdf ? getInsightsObj(selectedSessionForPdf.document_details) : {};

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
        <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 600 }}>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: '"Inter", sans-serif' }}>
      {/* Sidebar */}
      <nav style={{ width: '250px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '1.5rem 0', flexShrink: 0, zIndex: 20 }}>
        <div style={{ padding: '0 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
              backgroundColor: '#546edb',
              border: '1px solid #7a91ef',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(52, 69, 136, 0.3)',
              width: '28px',
              height: '28px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <img src={insureMindLogo} alt="InsureMind Logo" style={{ 
                height: '30px', 
                maxWidth: 'none',
                position: 'absolute',
                left: '-10px',
                top: '50%',
                transform: 'translateY(-50%)',
                filter: 'brightness(0) invert(1) drop-shadow(0px 1px 2px rgba(0,0,0,0.15))'
              }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Admin Portal</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>IT Operations</p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            <Users size={18} />
            <span style={{ fontSize: '0.9rem' }}>Users</span>
          </a>
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', marginTop: 'auto' }}>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '6px', color: '#64748b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontWeight: 500 }}>
            <LogOut size={18} />
            <span style={{ fontSize: '0.9rem' }}>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: '60px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', flexShrink: 0 }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>User Management</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="#64748b" />
            </div>
          </div>
        </header>

        {/* Dashboard Canvas */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>Registered Entities</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Directory of registered users and their policy analysis history.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', minWidth: '160px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Users</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{activeUsersCount}</span>
                </div>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', minWidth: '160px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Policies Analyzed</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{totalPoliciesAnalyzed}</span>
                  <Activity size={14} color="#2563eb" />
                </div>
              </div>
            </div>
          </div>

          {/* High Density Table */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '40px' }}></th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Join Date</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Analyses</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No users found.</td>
                    </tr>
                  ) : users.map(user => {
                    const isExpanded = expandedUsers[user.id];
                    const userSessions = getUserSessions(user.id);
                    return (
                      <React.Fragment key={user.id}>
                        {/* Main Row */}
                        <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid #e2e8f0', backgroundColor: isExpanded ? '#f1f5f9' : 'transparent', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <button onClick={() => toggleUserExpanded(user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: 0 }}>
                              {isExpanded ? <ChevronDown size={18} color="#2563eb" /> : <ChevronRight size={18} />}
                            </button>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: isExpanded ? '#2563eb' : '#0f172a' }}>{user.full_name || 'N/A'}</td>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: '"JetBrains Mono", monospace', color: '#475569' }}>{user.phone_number || 'N/A'}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{user.email || 'N/A'}</td>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: '"JetBrains Mono", monospace', color: '#475569' }}>{new Date(user.created_at).toISOString().split('T')[0]}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 600 }}>
                              {userSessions.length}
                            </span>
                          </td>
                        </tr>

                        {/* Nested Sub-table Row */}
                        {isExpanded && (
                          <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                            <td colSpan="6" style={{ padding: 0 }}>
                              <div style={{ margin: '0 1rem 1rem 3rem', borderLeft: '2px solid #2563eb', backgroundColor: '#ffffff', borderRadius: '0 6px 6px 0', borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={16} color="#2563eb" />
                                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>Policy Analysis History</h3>
                                  </div>
                                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID: {user.id.substring(0, 8)}</span>
                                </div>
                                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                                      <th style={{ padding: '0.5rem 1rem', fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Policy Info</th>
                                      <th style={{ padding: '0.5rem 1rem', fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Date</th>
                                      <th style={{ padding: '0.5rem 1rem', fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details Extracted</th>
                                      <th style={{ padding: '0.5rem 1rem', fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody style={{ fontSize: '0.8rem' }}>
                                    {userSessions.length === 0 ? (
                                      <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>No policies analyzed yet.</td></tr>
                                    ) : userSessions.map((session, i) => {
                                      const details = session.document_details || {};
                                      return (
                                        <tr key={session.id} style={{ borderBottom: i < userSessions.length - 1 ? '1px dashed #e2e8f0' : 'none', '&:hover': { backgroundColor: '#f8fafc' } }}>
                                          <td style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                                            <CheckCircle size={14} color="#10b981" />
                                            {details.insurance_company || 'Unknown Company'} - {details.product_name || 'Unknown Policy'}
                                          </td>
                                          <td style={{ padding: '0.75rem 1rem', fontFamily: '"JetBrains Mono", monospace', color: '#64748b' }}>
                                            {new Date(session.created_at).toLocaleString()}
                                          </td>
                                          <td style={{ padding: '0.75rem 1rem' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.7rem', border: '1px solid #e2e8f0' }}>
                                              {details.sum_insured ? `Sum Insured: ${details.sum_insured}` : 'Basic Details'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                            <button 
                                              onClick={() => setSelectedSessionForPdf(session)}
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem', backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                                              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                            >
                                              <Download size={12} /> Download PDF
                                            </button>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
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
              {currentPdfData.details?.map((detail, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', color: '#6b7280', width: '30%' }}>{detail.label}</td>
                  <td style={{ padding: '8px 0', color: '#111827', fontWeight: 'bold' }}>{detail.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {currentPdfData.inclusions && currentPdfData.inclusions.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', color: '#15803d', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Inclusions</h2>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#374151', columnCount: currentPdfData.inclusions.length > 20 ? 3 : currentPdfData.inclusions.length > 10 ? 2 : 1, columnGap: '20px' }}>
              {currentPdfData.inclusions.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '6px', breakInside: 'avoid-column' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {currentPdfData.exclusions && currentPdfData.exclusions.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', color: '#b91c1c', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Exclusions</h2>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#374151', columnCount: currentPdfData.exclusions.length > 20 ? 3 : currentPdfData.exclusions.length > 10 ? 2 : 1, columnGap: '20px' }}>
              {currentPdfData.exclusions.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '6px', breakInside: 'avoid-column' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {currentPdfData.contact_details && (
          (currentPdfData.contact_details.phone?.filter(p => p && p !== 'Not Found' && p !== 'Unknown').length > 0) || 
          (currentPdfData.contact_details.email?.filter(e => e && e !== 'Not Found' && e !== 'Unknown').length > 0) || 
          (currentPdfData.contact_details.website?.filter(w => w && w !== 'Not Found' && w !== 'Unknown').length > 0) || 
          (currentPdfData.contact_details.address && currentPdfData.contact_details.address !== 'Unknown' && currentPdfData.contact_details.address !== 'Not Found')
        ) && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', color: '#4338ca', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Contact Details</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '14px', color: '#374151' }}>
              {currentPdfData.contact_details.phone?.filter(p => p && p !== 'Not Found' && p !== 'Unknown').map((phone, idx) => (
                <li key={`phone-${idx}`} style={{ marginBottom: '6px' }}>📞 {phone}</li>
              ))}
              {currentPdfData.contact_details.email?.filter(e => e && e !== 'Not Found' && e !== 'Unknown').map((email, idx) => (
                <li key={`email-${idx}`} style={{ marginBottom: '6px' }}>✉ {email}</li>
              ))}
              {currentPdfData.contact_details.website?.filter(w => w && w !== 'Not Found' && w !== 'Unknown').map((website, idx) => (
                <li key={`website-${idx}`} style={{ marginBottom: '6px' }}>🌐 {website}</li>
              ))}
              {currentPdfData.contact_details.address && currentPdfData.contact_details.address !== 'Unknown' && currentPdfData.contact_details.address !== 'Not Found' && (
                <li style={{ marginBottom: '6px' }}>📍 {currentPdfData.contact_details.address}</li>
              )}
            </ul>
          </div>
        )}

        <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
          <span>Disclaimer: This is an AI-generated report. Please verify all critical information independently.</span>
          <span>Powered by InsureMind AI (Admin Export)</span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
