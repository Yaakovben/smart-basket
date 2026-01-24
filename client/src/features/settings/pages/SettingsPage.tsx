import { useNavigate } from 'react-router-dom';
import type { SettingsPageProps } from '../types/settings-types';
import { S } from '../../../global/styles';

export function SettingsPage({ onDeleteAllData }: SettingsPageProps) {
  const navigate = useNavigate();

  return (
    <div style={S.screen}>
      <div style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', padding: '48px 20px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={S.iconBtn} onClick={() => navigate('/')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 style={{ flex: 1, color: 'white', fontSize: '20px', fontWeight: '700', margin: 0 }}>הגדרות</h1>
        </div>
      </div>
      <div style={S.scrollableContent}>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={S.settingRow}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <span style={{ flex: 1 }}>התראות</span>
            <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: '#14B8A6', padding: '2px', cursor: 'pointer' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', marginRight: 'auto' }} />
            </div>
          </div>
          <div style={S.settingRow}>
            <span style={{ fontSize: '20px' }}>🌙</span>
            <span style={{ flex: 1 }}>מצב כהה</span>
            <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: '#E5E7EB', padding: '2px', cursor: 'pointer' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white' }} />
            </div>
          </div>
          <div style={{ ...S.settingRow, borderBottom: 'none' }}>
            <span style={{ fontSize: '20px' }}>🌐</span>
            <span style={{ flex: 1 }}>שפה</span>
            <span style={{ color: '#6B7280', fontSize: '14px' }}>עברית</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: '16px' }}>
          <div style={S.settingRow}>
            <span style={{ fontSize: '20px' }}>❓</span>
            <span style={{ flex: 1 }}>עזרה ותמיכה</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div style={{ ...S.settingRow, borderBottom: 'none' }}>
            <span style={{ fontSize: '20px' }}>ℹ️</span>
            <span style={{ flex: 1 }}>אודות</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: '16px' }}>
          <div style={{ ...S.settingRow, borderBottom: 'none', color: '#DC2626', cursor: 'pointer' }} onClick={onDeleteAllData}>
            <span style={{ fontSize: '20px' }}>🗑️</span>
            <span style={{ flex: 1 }}>מחק את כל הנתונים</span>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '13px', marginTop: '32px' }}>SmartBasket גרסה 1.0.0</p>
      </div>
    </div>
  );
}
