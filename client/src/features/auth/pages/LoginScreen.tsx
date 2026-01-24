import { useState } from 'react';
import type { LoginScreenProps, User } from '../../../global/types';
import { haptic } from '../../../global/helpers';

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, text: '', color: '' };
    if (pwd.length < 4) return { strength: 1, text: 'חלשה', color: '#EF4444' };
    if (pwd.length < 6) return { strength: 2, text: 'בינונית', color: '#F59E0B' };
    return { strength: 3, text: 'חזקה', color: '#10B981' };
  };

  const handleLogin = () => {
    setError('');
    if (!email.trim()) { setError('נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError('אימייל לא תקין'); return; }
    if (!password) { setError('נא להזין סיסמה'); return; }

    setLoading(true);
    haptic('light');

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
      const user = users.find((u: User) => u.email === email && u.password === password);
      if (user) { haptic('medium'); onLogin(user); }
      else { haptic('heavy'); setError('אימייל או סיסמה שגויים'); setLoading(false); }
    }, 500);
  };

  const handleRegister = () => {
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
      if (users.find((u: User) => u.email === email)) {
        haptic('heavy'); setError('אימייל זה כבר קיים במערכת'); setLoading(false); return;
      }
      const newUser = { id: `u${Date.now()}`, name: name.trim(), email, password };
      users.push(newUser);
      localStorage.setItem('sb_users', JSON.stringify(users));
      haptic('medium');
      onLogin(newUser);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    mode === 'login' ? handleLogin() : handleRegister();
  };

  const pwdStrength = mode === 'register' ? getPasswordStrength(password) : null;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 50px 14px 16px', borderRadius: '12px',
    border: '2px solid #E5E7EB', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', transition: 'all 0.2s ease',
    background: loading ? '#F9FAFB' : 'white', textAlign: 'right'
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute', right: '16px', top: '50%',
    transform: 'translateY(-50%)', fontSize: '20px', opacity: 0.5
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '14px', fontWeight: '600',
    color: '#374151', marginBottom: '8px'
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
      padding: '20px', fontFamily: '-apple-system, sans-serif', direction: 'rtl'
    }}>
      <div style={{
        width: '100%', maxWidth: '440px', background: 'white', borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <div style={{ flexShrink: 0, padding: '32px 32px 20px', textAlign: 'center', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{
            width: '72px', height: '72px', background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(20, 184, 166, 0.25)'
          }}>
            <span style={{ fontSize: '40px' }}>🛒</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px', color: '#111827' }}>SmartBasket</h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '14px' }}>רשימות קניות חכמות ומשותפות</p>
        </div>

        <div style={{ flexShrink: 0, padding: '20px 32px 0' }}>
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: '12px', padding: '4px' }}>
            {(['login', 'register'] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => { setMode(tab); setError(''); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                  background: mode === tab ? 'white' : 'transparent',
                  color: mode === tab ? '#14B8A6' : '#6B7280',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: mode === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                }}>
                {tab === 'login' ? 'התחברות' : 'הרשמה'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 32px', minHeight: 0 }}>
          <form onSubmit={handleSubmit} id="auth-form">
            {mode === 'register' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>שם מלא</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>👤</span>
                  <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
                    placeholder="הזן את שמך המלא" autoComplete="name" required disabled={loading}
                    onFocus={e => e.target.style.borderColor = '#14B8A6'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>אימייל</label>
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>📧</span>
                <input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@mail.com" dir="ltr" autoComplete="email" required disabled={loading}
                  onFocus={e => e.target.style.borderColor = '#14B8A6'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
              </div>
            </div>

            <div style={{ marginBottom: mode === 'register' ? '20px' : '0' }}>
              <label style={labelStyle}>סיסמה</label>
              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>🔒</span>
                <input type="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required disabled={loading}
                  onFocus={e => e.target.style.borderColor = '#14B8A6'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
              </div>
              {mode === 'register' && password && pwdStrength && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(pwdStrength.strength / 3) * 100}%`, height: '100%', background: pwdStrength.color, transition: 'all 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: '13px', color: pwdStrength.color, fontWeight: '600' }}>{pwdStrength.text}</span>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label style={labelStyle}>אימות סיסמה</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}>🔑</span>
                  <input type="password" style={inputStyle} value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" autoComplete="new-password" required disabled={loading}
                    onFocus={e => e.target.style.borderColor = '#14B8A6'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
              </div>
            )}
          </form>
        </div>

        <div style={{ flexShrink: 0, padding: '20px 32px 32px', borderTop: '1px solid #F3F4F6' }}>
          {error && (
            <div style={{
              padding: '14px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5',
              borderRadius: '12px', color: '#DC2626', fontSize: '14px', marginBottom: '16px',
              textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}
          <button type="submit" form="auth-form" disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
              background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #14B8A6, #10B981)',
              color: 'white', fontSize: '16px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(20, 184, 166, 0.3)',
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
            }}>
            {loading ? (
              <>
                <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%', animation: 'pulse 1s ease infinite' }} />
                <span>טוען...</span>
              </>
            ) : (
              <><span>{mode === 'login' ? 'התחבר' : 'הרשם'}</span><span>→</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
