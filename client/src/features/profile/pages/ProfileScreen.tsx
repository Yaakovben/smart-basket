import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProfileScreenProps } from '../../../global/types';
import { S } from '../../../global/styles';
import { ConfirmModal } from '../../../global/components';

export function ProfileScreen({ user, onUpdateUser, onLogout }: ProfileScreenProps) {
  const navigate = useNavigate();
  const [editProfile, setEditProfile] = useState<{ name: string; email: string; avatarColor: string; avatarEmoji: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div style={S.screen}>
      <div style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', padding: '48px 20px 40px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button style={S.iconBtn} onClick={() => { setEditProfile(null); navigate('/'); }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 style={{ flex: 1, color: 'white', fontSize: '20px', fontWeight: '700', margin: 0 }}>פרופיל</h1>
          {!editProfile && <button style={S.iconBtn} onClick={() => setEditProfile({ name: user.name, email: user.email, avatarColor: user.avatarColor || '#14B8A6', avatarEmoji: user.avatarEmoji || '' })}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>}
        </div>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: editProfile?.avatarColor || user.avatarColor || 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '4px solid rgba(255,255,255,0.3)', fontSize: '40px', color: 'white', fontWeight: '700' }}>
          {editProfile?.avatarEmoji || user.avatarEmoji || user.name.charAt(0)}
        </div>
        {!editProfile && <>
          <div style={{ color: 'white', fontSize: '22px', fontWeight: '700' }}>{user.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '4px' }}>{user.email}</div>
        </>}
      </div>

      <div style={{ ...S.scrollableContent, marginTop: '-20px' }}>
        {editProfile ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={S.label}>צבע אווטר</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#0891B2'].map(c => (
                  <button key={c} onClick={() => setEditProfile({ ...editProfile, avatarColor: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: editProfile.avatarColor === c ? '3px solid #111' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={S.label}>אימוג׳י (אופציונלי)</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['', '😊', '😎', '🦁', '🐻', '🦊', '🐸', '🌟', '⚡', '🔥'].map(e => (
                  <button key={e} onClick={() => setEditProfile({ ...editProfile, avatarEmoji: e })} style={{ width: '44px', height: '44px', borderRadius: '10px', border: editProfile.avatarEmoji === e ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: editProfile.avatarEmoji === e ? '#F0FDFA' : 'white', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {e || <span style={{ fontSize: '12px', color: '#9CA3AF' }}>ללא</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>שם</label>
              <input style={S.input} value={editProfile.name} onChange={e => setEditProfile({ ...editProfile, name: e.target.value })} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>אימייל</label>
              <input style={S.input} value={editProfile.email} onChange={e => setEditProfile({ ...editProfile, email: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={S.cancelBtn} onClick={() => setEditProfile(null)}>ביטול</button>
              <button style={{ ...S.primaryBtn, flex: 1 }} onClick={() => { onUpdateUser(editProfile); setEditProfile(null); }}>שמור שינויים</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={S.settingRow}>
                <span style={{ fontSize: '20px' }}>👤</span>
                <span style={{ flex: 1 }}>שם</span>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>{user.name}</span>
              </div>
              <div style={{ ...S.settingRow, borderBottom: 'none' }}>
                <span style={{ fontSize: '20px' }}>✉️</span>
                <span style={{ flex: 1 }}>אימייל</span>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>{user.email}</span>
              </div>
            </div>

            <button style={{ width: '100%', padding: '16px', marginTop: '24px', borderRadius: '12px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }} onClick={() => setConfirmLogout(true)}>התנתק</button>
          </>
        )}
      </div>

      {confirmLogout && <ConfirmModal title="התנתקות" message="להתנתק מהחשבון?" confirmText="התנתק" onConfirm={() => { onLogout(); navigate('/login'); }} onCancel={() => setConfirmLogout(false)} />}
    </div>
  );
}
