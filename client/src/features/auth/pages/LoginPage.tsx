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

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-teal-50 to-teal-100 font-sans" dir="rtl">
      {/* Fixed Logo Section - Never scrolls */}
      <div className="flex-shrink-0 pt-8 pb-4 px-5 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-teal-500/25">
          <span className="text-5xl">🛒</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">SmartBasket</h1>
        <p className="text-gray-500 text-sm">רשימות קניות חכמות ומשותפות</p>
      </div>

      {/* Scrollable Form Section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-8">
        <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl shadow-teal-500/10 p-8 animate-scaleIn">
          {/* Tab Switch */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-7">
            <button
              type="button"
              className={`flex-1 py-3 rounded-lg border-none text-base font-semibold cursor-pointer transition-all ${
                mode === 'login'
                  ? 'bg-white text-teal-500 shadow-sm'
                  : 'bg-transparent text-gray-500'
              }`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              התחברות
            </button>
            <button
              type="button"
              className={`flex-1 py-3 rounded-lg border-none text-base font-semibold cursor-pointer transition-all ${
                mode === 'register'
                  ? 'bg-white text-teal-500 shadow-sm'
                  : 'bg-transparent text-gray-500'
              }`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              הרשמה
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Name Field (Register only) */}
            {mode === 'register' && (
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">שם מלא</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl opacity-50">👤</span>
                  <input
                    type="text"
                    className={`w-full py-3.5 px-4 pr-12 rounded-xl border-2 border-gray-200 text-base outline-none text-right transition-all ${
                      loading ? 'bg-gray-50' : 'bg-white'
                    }`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="הזן את שמך המלא"
                    autoComplete="name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">אימייל</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl opacity-50">📧</span>
                <input
                  type="email"
                  className={`w-full py-3.5 px-4 pr-12 rounded-xl border-2 border-gray-200 text-base outline-none transition-all ${
                    loading ? 'bg-gray-50' : 'bg-white'
                  }`}
                  style={{ textAlign: 'right' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  dir="ltr"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className={mode === 'register' ? 'mb-5' : 'mb-6'}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">סיסמה</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl opacity-50">🔒</span>
                <input
                  type="password"
                  className={`w-full py-3.5 px-4 pr-12 rounded-xl border-2 border-gray-200 text-base outline-none text-right transition-all ${
                    loading ? 'bg-gray-50' : 'bg-white'
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  disabled={loading}
                />
              </div>
              {mode === 'register' && password && pwdStrength && (
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(pwdStrength.strength / 3) * 100}%`,
                        backgroundColor: pwdStrength.color
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: pwdStrength.color }}>
                    {pwdStrength.text}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password (Register only) */}
            {mode === 'register' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">אימות סיסמה</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl opacity-50">🔑</span>
                  <input
                    type="password"
                    className={`w-full py-3.5 px-4 pr-12 rounded-xl border-2 border-gray-200 text-base outline-none text-right transition-all ${
                      loading ? 'bg-gray-50' : 'bg-white'
                    }`}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-red-600 text-sm mb-5 text-center flex items-center justify-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-4 rounded-xl border-none text-white text-base font-bold cursor-pointer flex items-center justify-center gap-2.5 min-h-[52px] ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/30 hover:opacity-90'
              }`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>טוען...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'התחבר' : 'הרשם'}</span>
                  <span>←</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
