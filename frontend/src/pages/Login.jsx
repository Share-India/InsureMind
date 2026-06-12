import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import insureMindLogo from '../../InsureMind.png';

const Login = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');

    if (!isRegistering) {
      // Login
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        const name = data.user?.user_metadata?.full_name || 'Admin';
        localStorage.setItem('userName', name);
        if (data.user?.email === 'it.ins@shareindia.co.in') {
          navigate('/admin/dashboard');
        } else {
          navigate('/upload');
        }
      }
    } else {
      // Register
      let finalPhone = phoneNumber.trim();
      if (finalPhone.length === 10 && !finalPhone.startsWith('+')) {
        finalPhone = '+91' + finalPhone;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || 'User',
            phone: finalPhone
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (!data.session) {
        // Supabase returns a null session if the account already exists (or if email confirmation is required)
        setError("Account already exists with this email. Please Sign In instead!");
      } else {
        // Trigger Phone Verification via OTP
        const { error: phoneError } = await supabase.auth.updateUser({ phone: finalPhone });
        if (phoneError) {
          setError(phoneError.message);
        } else {
          setOtpStep(true);
        }
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    let finalPhone = phoneNumber.trim();
    if (finalPhone.length === 10 && !finalPhone.startsWith('+')) {
      finalPhone = '+91' + finalPhone;
    }

    let { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: finalPhone,
      token: otpCode.trim(),
      type: 'phone_change'
    });

    if (verifyError && verifyError.message.includes('Token has expired or is invalid')) {
      // Fallback try with 'sms' type just in case Supabase expects it instead
      const fallback = await supabase.auth.verifyOtp({
        phone: finalPhone,
        token: otpCode.trim(),
        type: 'sms'
      });
      if (!fallback.error) {
        verifyError = null;
        data = fallback.data;
      }
    }

    if (verifyError) {
      setError(verifyError.message);
    } else {
      const name = fullName || 'User';
      localStorage.setItem('userName', name);
      if (email === 'it.ins@shareindia.co.in') {
        navigate('/admin/dashboard');
      } else {
        navigate('/upload');
      }
    }
  };

  return (
    <div className="login-container">
      {/* Left Side: Form */}
      <div className="login-left">
        <div className="login-content">
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '-1.5rem', marginBottom: '1.5rem', marginLeft: '-8.5rem' }}>
            <div className="login-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <div style={{
                backgroundColor: '#3d52a0',
                border: '1px solid #6b80d6',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '0.5rem',
                boxShadow: '0 4px 12px rgba(52, 69, 136, 0.4)',
                width: '56px',
                height: '56px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <img src={insureMindLogo} alt="InsureMind Logo" style={{ 
                  height: '48px', 
                  maxWidth: 'none',
                  position: 'absolute',
                  left: '-16px', // Perfectly mathematically centered
                  top: '50%',
                  transform: 'translateY(-50%)',
                  filter: 'brightness(0) invert(1)' 
                }} />
              </div>
              <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', fontFamily: '"Roboto Slab", serif' }}>InsureMind</h2>
            </div>
            <div style={{ marginTop: '-0.5rem', fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
              by Share India
            </div>
          </div>

          <div className="login-header">
            <h1>{otpStep ? 'Verify your Phone' : (isRegistering ? 'Create your account' : 'Welcome back')}</h1>
            <p>{otpStep ? `We've sent an SMS to ${phoneNumber}` : (isRegistering ? 'Join the sovereign intelligence network.' : 'Access your sovereign intelligence dashboard.')}</p>
          </div>

          {otpStep ? (
            <form className="login-form" onSubmit={handleVerifyOtp}>
              {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>{error}</div>}

              <div className="form-group">
                <label>6-DIGIT OTP</label>
                <input 
                  type="text" 
                  placeholder="123456" 
                  value={otpCode} 
                  onChange={(e) => setOtpCode(e.target.value)} 
                  maxLength={6}
                  required 
                />
              </div>

              <button type="submit" className="btn-primary login-btn">
                Verify & Continue
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleAuth}>
              {error && <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>{error}</div>}

              {isRegistering && (
                <>
                  <div className="form-group">
                    <label>FULL NAME</label>
                    <input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>PHONE NUMBER</label>
                    <input type="tel" placeholder="+919876543210" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>EMAIL</label>
                <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label>PASSWORD</label>
                  {!isRegistering && <a href="#" className="forgot-link">Forgot Password?</a>}
                </div>
                <div className="input-with-icon">
                  <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  {showPassword ? (
                    <EyeOff className="input-icon" size={18} onClick={() => setShowPassword(false)} style={{ cursor: 'pointer' }} />
                  ) : (
                    <Eye className="input-icon" size={18} onClick={() => setShowPassword(true)} style={{ cursor: 'pointer' }} />
                  )}
                </div>
              </div>

              {isRegistering && (
                <div className="form-group">
                  <label>CONFIRM PASSWORD</label>
                  <div className="input-with-icon">
                    <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" required />
                    {showConfirmPassword ? (
                      <EyeOff className="input-icon" size={18} onClick={() => setShowConfirmPassword(false)} style={{ cursor: 'pointer' }} />
                    ) : (
                      <Eye className="input-icon" size={18} onClick={() => setShowConfirmPassword(true)} style={{ cursor: 'pointer' }} />
                    )}
                  </div>
                </div>
              )}

              {!isRegistering && (
                <div className="checkbox-group">
                  <input type="checkbox" id="keep-logged" />
                  <label htmlFor="keep-logged">Keep me logged in for 30 days</label>
                </div>
              )}

              <button type="submit" className="btn-primary login-btn">
                {isRegistering ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          )}

          {!otpStep && (
            <div className="login-footer">
              <p className="signup-link">
                {isRegistering ? (
                  <>Already have an account? <strong onClick={() => setIsRegistering(false)}>Sign In</strong></>
                ) : (
                  <>New to InsureMind? <strong onClick={() => setIsRegistering(true)}>Create an Account</strong></>
                )}
              </p>

              <div className="security-badge">
                <span>SOVEREIGN SECURITY STANDARD</span>
                <div className="security-icons">
                  <CheckCircle size={14} />
                  <Shield size={14} />
                </div>
              </div>

              <div className="copyright">
                © 2026 INSUREMIND INTELLIGENCE. SOVEREIGN SECURITY STANDARDS APPLIED.
                <div className="legal-links">
                  <a href="#">PRIVACY</a>
                  <a href="#">COMPLIANCE</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Graphic */}
      <div className="login-right">
        <div className="right-content">
          <div className="badge">
            <Shield size={14} /> INTELLIGENCE LAYER ACTIVE
          </div>

          <h1 className="hero-title">
            Smarter Insurance<br />
            Intelligence at Your<br />
            Fingertips.
          </h1>

          <p className="hero-subtitle">
            Harness the power of cognitive document analysis to<br />
            identify risks, automate compliance, and streamline<br />
            claims with sovereign precision.
          </p>

          <div className="feature-cards">
            <div className="feature-card">
              <div className="feature-icon bg-blue">
                <FileText size={20} />
              </div>
              <div className="feature-text">
                <h4>AI READING</h4>
                <span>99.8% Extraction Accuracy</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon bg-dark">
                <Shield size={20} />
              </div>
              <div className="feature-text">
                <h4>SECURE VAULT</h4>
                <span>End-to-End Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
