import { useState } from 'react';
import type { User } from '../../../shared/types';
import { haptic, isValidEmail, getPasswordStrength } from '../../../shared/helpers';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError('');

    if (!email.trim()) { setError('נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError('אימייל לא תקין'); return; }
    if (!password) { setError('נא להזין סיסמה'); return; }

    setLoading(true);
    haptic('light');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
      const u = users.find((x: User) => x.email === email && x.password === password);

      if (u) {
        haptic('medium');
        onLogin(u);
      } else {
        haptic('heavy');
        setError('אימייל או סיסמה שגויים');
        setLoading(false);
      }
    }, 500);
  };

  const register = async () => {
    setError('');

    if (!name.trim()) { setError('נא להזין שם'); return; }
    if (name.trim().length < 2) { setError('שם חייב להכיל לפחות 2 תווים'); return; }
    if (!email.trim()) { setError('נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError('אימייל לא תקין'); return; }
    if (!password) { setError('נא להזין סיסמה'); return; }
    if (password.length < 4) { setError('סיסמה חייבת להכיל לפחות 4 תווים'); return; }
    if (!confirm) { setError('נא לאמת את הסיסמה'); return; }
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return; }

    setLoading(true);
    haptic('light');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');

      if (users.find((x: User) => x.email === email)) {
        haptic('heavy');
        setError('אימייל זה כבר קיים במערכת');
        setLoading(false);
        return;
      }

      const u = { id: `u${Date.now()}`, name: name.trim(), email, password };
      users.push(u);
      localStorage.setItem('sb_users', JSON.stringify(users));
      haptic('medium');
      onLogin(u);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (mode === 'login') login();
    else register();
  };

  const pwdStrength = mode === 'register' ? getPasswordStrength(password) : null;

  const inputStyle = {
    width: '100%',
    padding: '14px 16px 14px 50px',
    paddingRight: '50px',
    borderRadius: '12px',
    border: '2px solid #E5E7EB',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'all 0.2s ease',
    background: loading ? '#F9FAFB' : 'white',
    textAlign: 'right' as const
  };

  const iconStyle = {
    position: 'absolute' as const,
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '20px',
    opacity: 0.5
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
      padding: '20px',
      fontFamily: '-apple-system, sans-serif',
      direction: 'rtl'
    }}>
      {/* Card Container - Fixed height with internal scroll */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Fixed Header - Logo & Title (never scrolls) */}
        <div style={{
          flexShrink: 0,
          padding: '32px 32px 20px',
          textAlign: 'center',
          borderBottom: '1px solid #F3F4F6'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(20, 184, 166, 0.25)'
          }}>
            <span style={{ fontSize: '40px' }}>🛒</span>
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            margin: '0 0 6px',
            color: '#111827'
          }}>SmartBasket</h1>
          <p style={{
            color: '#6B7280',
            margin: 0,
            fontSize: '14px'
          }}>רשימות קניות חכמות ומשותפות</p>
        </div>

        {/* Fixed Tab Switch */}
        <div style={{
          flexShrink: 0,
          padding: '20px 32px 0'
        }}>
          <div style={{
            display: 'flex',
            background: '#F3F4F6',
            borderRadius: '12px',
            padding: '4px'
          }}>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: mode === 'login' ? 'white' : 'transparent',
                color: mode === 'login' ? '#14B8A6' : '#6B7280',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
              }}
              onClick={() => { setMode('login'); setError(''); }}
            >
              התחברות
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: mode === 'register' ? 'white' : 'transparent',
                color: mode === 'register' ? '#14B8A6' : '#6B7280',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: mode === 'register' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
              }}
              onClick={() => { setMode('register'); setError(''); }}
            >
              הרשמה
            </button>
          </div>
        </div>

        {/* Scrollable Form Area - Only this part scrolls */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '24px 32px',
          minHeight: 0
        }}>
          <form onSubmit={handleSubmit} id="auth-form">
            {/* Name Field (Register only) */}
            {mode === 'register' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>שם מלא</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>👤</span>
                  <input
                    type="text"
                    style={inputStyle}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="הזן את שמך המלא"
                    autoComplete="name"
                    required
                    disabled={loading}
                    onFocus={(e) => (e.target.style.borderColor = '#14B8A6')}
                    onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>אימייל</label>
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>📧</span>
                <input
                  type="email"
                  style={inputStyle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  dir="ltr"
                  autoComplete="email"
                  required
                  disabled={loading}
                  onFocus={(e) => (e.target.style.borderColor = '#14B8A6')}
                  onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: mode === 'register' ? '20px' : '0' }}>
              <label style={labelStyle}>סיסמה</label>
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>🔒</span>
                <input
                  type="password"
                  style={inputStyle}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  disabled={loading}
                  onFocus={(e) => (e.target.style.borderColor = '#14B8A6')}
                  onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>
              {mode === 'register' && password && pwdStrength && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(pwdStrength.strength / 3) * 100}%`,
                      height: '100%',
                      background: pwdStrength.color,
                      transition: 'all 0.3s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: '13px', color: pwdStrength.color, fontWeight: '600' }}>{pwdStrength.text}</span>
                </div>
              )}
            </div>

            {/* Confirm Password (Register only) */}
            {mode === 'register' && (
              <div>
                <label style={labelStyle}>אימות סיסמה</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>🔑</span>
                  <input
                    type="password"
                    style={inputStyle}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    onFocus={(e) => (e.target.style.borderColor = '#14B8A6')}
                    onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Fixed Footer - Error & Submit Button (never scrolls) */}
        <div style={{
          flexShrink: 0,
          padding: '20px 32px 32px',
          borderTop: '1px solid #F3F4F6'
        }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '14px 16px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '12px',
              color: '#DC2626',
              fontSize: '14px',
              marginBottom: '16px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            form="auth-form"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #14B8A6, #10B981)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(20, 184, 166, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'pulse 1s ease infinite'
                }} />
                <span>טוען...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'התחבר' : 'הרשם'}</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
