import { memo, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Typography, TextField, Button, IconButton, Avatar, Chip, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import type { List, User, Member, Product } from '../../../global/types';
import { haptic, COMMON_STYLES, LIST_ICONS, GROUP_ICONS, LIST_COLORS, generateInviteMessage, generateShareListMessage, BRAND_COLORS } from '../../../global/helpers';
import { Modal, MemberAvatar } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import type { EditListForm } from '../types/list-types';

// ===== סגנונות =====
const labelSx = COMMON_STYLES.label;

const modalOverlaySx = {
  position: 'fixed',
  inset: 0,
  bgcolor: 'rgba(0,0,0,0.5)',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
  touchAction: 'none'
};

const modalContainerSx = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  borderRadius: '20px',
  p: 3,
  zIndex: 1001,
  width: '90%',
  maxWidth: 340,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  overscrollBehavior: 'contain',
  maxHeight: '85vh',
  overflowY: 'auto'
};

// ===== אייקון WhatsApp =====
const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ===== מודאל הזמנה =====
interface InviteModalProps {
  isOpen: boolean;
  list: List;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const InviteModal = memo(({ isOpen, list, onClose, showToast }: InviteModalProps) => {
  const { t } = useSettings();
  const [tab, setTab] = useState<'text' | 'qr'>('text');

  useEffect(() => { if (!isOpen) setTab('text'); }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(generateInviteMessage(list, t))
      .then(() => showToast(t('copied')))
      .catch(() => showToast(t('copyError')));
  };

  const handleShareQR = () => {
    const svg = document.querySelector('#qr-container svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 500; canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 500, 500);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 50, 50, 400, 400);
      canvas.toBlob(blob => {
        if (!blob) return;
        if (navigator.share) {
          const file = new File([blob], `${list.name}-qr.png`, { type: 'image/png' });
          navigator.share({ title: `הצטרף ל"${list.name}"`, files: [file] }).catch(() => {});
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${list.name}-qr.png`;
          a.click();
          showToast(t('saved'));
        }
      }, 'image/png');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <>
      <Box sx={modalOverlaySx} onClick={onClose} aria-hidden="true" />
      <Box key={tab} sx={{
        ...modalContainerSx,
        p: 2.5,
        perspective: '1400px',
        transformStyle: 'preserve-3d',
        animation: 'modalFlip 0.85s cubic-bezier(0.23, 1, 0.32, 1)',
        '@keyframes modalFlip': {
          '0%': { transform: 'translate(-50%, -50%) rotateY(-180deg) scale(0.85)', opacity: 0, filter: 'blur(4px)' },
          '50%': { opacity: 1, filter: 'blur(0)' },
          '100%': { transform: 'translate(-50%, -50%) rotateY(0deg) scale(1)', opacity: 1, filter: 'blur(0)' }
        },
      }} role="dialog" aria-labelledby="invite-title">
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'action.hover', zIndex: 1 }} size="small">
          <CloseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        </IconButton>

        <Box sx={{ textAlign: 'center', mb: 1.75 }}>
          <Avatar sx={{ width: 60, height: 60, background: COMMON_STYLES.gradients.header, mx: 'auto', mb: 1.25, boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
            <PersonAddIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Typography id="invite-title" sx={{ fontSize: 19, fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
            {t('inviteFriends')}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.25 }}>"{list.name}"</Typography>
        </Box>

      {tab === 'text' ? (
        <Box key="text" sx={{ minHeight: 230, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* קוד + סיסמה */}
          <Box sx={{ bgcolor: 'rgba(20,184,166,0.06)', borderRadius: '14px', border: '1.5px solid', borderColor: 'rgba(20,184,166,0.25)', mb: 1.5, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '10px 14px', borderBottom: list.password ? '1px solid' : 'none', borderColor: 'rgba(20,184,166,0.2)' }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 600 }}>{t('groupCode')}</Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 700, color: 'primary.main', letterSpacing: 2, fontFamily: 'monospace' }}>{list.inviteCode}</Typography>
            </Box>
            {list.password && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '10px 14px' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 600 }}>{t('password')}</Typography>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: 'primary.main', letterSpacing: 2, fontFamily: 'monospace' }}>{list.password}</Typography>
              </Box>
            )}
          </Box>
          {/* כפתורים */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => {
                const msg = generateInviteMessage(list, t);
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              fullWidth startIcon={<WhatsAppIcon />}
              sx={{
                background: `linear-gradient(135deg, ${BRAND_COLORS.whatsapp}, ${BRAND_COLORS.whatsappHover})`,
                color: 'white',
                '&:hover': { background: `linear-gradient(135deg, ${BRAND_COLORS.whatsappHover}, #128C7E)`, transform: 'translateY(-1px)' },
                '&:active': { transform: 'translateY(0)' },
                borderRadius: '14px', py: 1.5, textTransform: 'none', fontWeight: 700, fontSize: 14,
                boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
                transition: 'all 0.2s',
              }}
            >
              WhatsApp
            </Button>
            <Button
              fullWidth onClick={handleCopy} startIcon={<ContentCopyIcon />}
              sx={{
                background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                color: 'white',
                '&:hover': { background: 'linear-gradient(135deg, #0D9488, #0F766E)', transform: 'translateY(-1px)' },
                '&:active': { transform: 'translateY(0)' },
                borderRadius: '14px', py: 1.5, textTransform: 'none', fontWeight: 700, fontSize: 14,
                boxShadow: '0 4px 16px rgba(20,184,166,0.35)',
                transition: 'all 0.2s',
              }}
            >
              העתק
            </Button>
          </Box>
          {list.inviteCode && (
            <Box
              onClick={() => { haptic('light'); setTab('qr'); }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                mt: 2,
                py: 1,
                borderRadius: '10px',
                bgcolor: 'rgba(20,184,166,0.08)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                '&:hover': { bgcolor: 'rgba(20,184,166,0.14)' },
                '&:active': { transform: 'scale(0.98)' }
              }}
            >
              <QrCode2Icon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'primary.main' }}>
                הצג קוד QR
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Box key="qr" sx={{ height: 305, display: 'flex', flexDirection: 'column', justifyContent: 'center', /* flip animation on parent */ }}>
          {/* QR */}
          <Box sx={{ mb: 1.5, textAlign: 'center' }} id="qr-container">
            <Box sx={{
              display: 'inline-block',
              p: 1.5,
              borderRadius: '16px',
              bgcolor: 'white',
              boxShadow: '0 4px 20px rgba(20,184,166,0.15)',
            }}>
              <QRCodeSVG
                value={`${window.location.origin}/join?code=${list.inviteCode}&password=${list.password || ''}`}
                size={130} level="H" fgColor="#0D9488"
                style={{ display: 'block' }}
              />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1.25 }}>
              סרוק להצטרפות מיידית
            </Typography>
          </Box>
          {/* כפתורים */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              fullWidth onClick={handleShareQR}
              startIcon={<WhatsAppIcon />}
              sx={{
                background: `linear-gradient(135deg, ${BRAND_COLORS.whatsapp}, ${BRAND_COLORS.whatsappHover})`,
                color: 'white',
                '&:hover': { background: `linear-gradient(135deg, ${BRAND_COLORS.whatsappHover}, #128C7E)`, transform: 'translateY(-1px)' },
                '&:active': { transform: 'translateY(0)' },
                borderRadius: '14px', py: 1.5, textTransform: 'none', fontWeight: 700, fontSize: 14,
                boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
                transition: 'all 0.2s',
              }}
            >
              שלח QR
            </Button>
            <Button
              fullWidth
              onClick={() => {
                const svg = document.querySelector('#qr-container svg');
                if (!svg) return;
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement('canvas');
                canvas.width = 500; canvas.height = 500;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 500, 500);
                const img = new Image();
                img.onload = () => {
                  ctx.drawImage(img, 50, 50, 400, 400);
                  canvas.toBlob(blob => {
                    if (!blob) return;
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${list.name}-qr.png`;
                    a.click();
                    showToast(t('saved'));
                  }, 'image/png');
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
              }}
              startIcon={<DownloadIcon />}
              sx={{
                background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                color: 'white',
                '&:hover': { background: 'linear-gradient(135deg, #0D9488, #0F766E)', transform: 'translateY(-1px)' },
                '&:active': { transform: 'translateY(0)' },
                borderRadius: '14px', py: 1.5, textTransform: 'none', fontWeight: 700, fontSize: 14,
                boxShadow: '0 4px 16px rgba(20,184,166,0.35)',
                transition: 'all 0.2s',
              }}
            >
              שמור
            </Button>
          </Box>
          <Box
            onClick={() => { haptic('light'); setTab('text'); }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              mt: 2,
              py: 1,
              borderRadius: '10px',
              bgcolor: 'rgba(20,184,166,0.08)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              '&:hover': { bgcolor: 'rgba(20,184,166,0.14)' },
              '&:active': { transform: 'scale(0.98)' }
            }}
          >
            <VpnKeyOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'primary.main' }}>
              חזרה לקוד וסיסמה
            </Typography>
          </Box>
        </Box>
      )}
      </Box>
    </>
  );
});

InviteModal.displayName = 'InviteModal';

// ===== מודאל חברים =====
interface MembersModalProps {
  isOpen: boolean;
  list: List;
  members: (Member | User)[];
  isOwner: boolean;
  onClose: () => void;
  onRemoveMember: (id: string, name: string) => void;
  onLeaveGroup: () => void;
  onlineUserIds?: Set<string>;
  currentUserId?: string;
}

export const MembersModal = memo(({
  isOpen,
  list,
  members,
  isOwner,
  onClose,
  onRemoveMember,
  onLeaveGroup,
  onlineUserIds,
  currentUserId
}: MembersModalProps) => {
  const { t } = useSettings();

  if (!isOpen) return null;

  return (
    <Modal title={t('members')} onClose={onClose}>
      {members.map((m, i) => (
        <Box
          key={m.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.5,
            borderBottom: i < members.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider'
          }}
        >
          <MemberAvatar member={m} size={44} index={i} isOnline={m.id !== currentUserId && onlineUserIds?.has(m.id)} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary' }}>{m.name}</Typography>
              {m.id === list.owner.id && (
                <Chip label={t('admin')} size="small" sx={{ bgcolor: 'warning.light', color: 'warning.dark', height: 22 }} />
              )}
              {m.id !== currentUserId && onlineUserIds?.has(m.id) && (
                <Chip
                  label={t('online')}
                  size="small"
                  sx={{ bgcolor: '#ECFDF5', color: '#059669', height: 22, fontSize: 11, fontWeight: 600 }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</Typography>
          </Box>
          {isOwner && m.id !== list.owner.id && (
            <Button
              onClick={() => onRemoveMember(m.id, m.name)}
              size="small"
              sx={{
                bgcolor: 'rgba(239, 68, 68, 0.1)',
                color: 'error.main',
                fontSize: 11,
                fontWeight: 600,
                px: 1.5,
                py: 0.5,
                minWidth: 'auto',
                borderRadius: '6px',
                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' }
              }}
              aria-label={`${t('removeMember')} ${m.name}`}
            >
              {t('removeMember')}
            </Button>
          )}
        </Box>
      ))}
      {!isOwner && list.isGroup && (
        <Button
          fullWidth
          onClick={onLeaveGroup}
          sx={{ mt: 2.5, bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main', fontWeight: 600, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' } }}
          aria-label={t('leaveGroup')}
        >
          {t('leaveGroup')}
        </Button>
      )}
    </Modal>
  );
});

MembersModal.displayName = 'MembersModal';

// ===== מודאל שיתוף רשימה =====
interface ShareListModalProps {
  isOpen: boolean;
  list: List;
  pendingProducts: Product[];
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const ShareListModal = memo(({
  isOpen,
  list,
  pendingProducts,
  onClose,
  showToast
}: ShareListModalProps) => {
  const { t } = useSettings();

  // מניעת גלילת רקע כשמודאל פתוח
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(generateShareListMessage(list, t))
      .then(() => { showToast(t('copied')); onClose(); })
      .catch(() => showToast(t('copyError')));
  };

  return (
    <>
      <Box sx={modalOverlaySx} onClick={onClose} aria-hidden="true" />
      <Box sx={modalContainerSx} role="dialog" aria-labelledby="share-title">
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'action.hover' }}
          size="small"
          aria-label={t('close')}
        >
          <CloseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        </IconButton>
        <Box sx={{ textAlign: 'center', mb: 2.5 }}>
          <Avatar sx={{ width: 64, height: 64, background: COMMON_STYLES.gradients.header, mx: 'auto', mb: 2, boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
            <ShareIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Typography id="share-title" sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary' }}>{t('shareList')}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{t('shareListDescription')}</Typography>
        </Box>
        <Box sx={{ bgcolor: 'rgba(20, 184, 166, 0.06)', borderRadius: '12px', border: '1.5px solid', borderColor: 'rgba(20, 184, 166, 0.3)', mb: 2.5, overflow: 'hidden' }}>
          <Box sx={{ p: '12px 16px', borderBottom: '1px solid', borderColor: 'rgba(20, 184, 166, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'primary.main' }}>{list.name}</Typography>
            <Chip label={`${pendingProducts.length} ${t('items')}`} size="small" sx={{ bgcolor: 'transparent', color: 'primary.main', fontWeight: 500 }} />
          </Box>
          <Box sx={{ p: '12px 16px', maxHeight: 140, overflow: 'auto' }}>
            {pendingProducts.length === 0 ? (
              <Typography sx={{ color: 'text.secondary', fontSize: 14, textAlign: 'center', py: 1 }}>{t('noProducts')}</Typography>
            ) : (
              pendingProducts.slice(0, 5).map((p, i) => (
                <Box
                  key={p.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.75,
                    borderBottom: i < Math.min(pendingProducts.length, 5) - 1 ? '1px solid' : 'none',
                    borderColor: 'rgba(20, 184, 166, 0.2)'
                  }}
                >
                  <Typography sx={{ fontSize: 14, color: 'primary.main' }}>• {p.name}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'primary.main' }}>{p.quantity} {p.unit}</Typography>
                </Box>
              ))
            )}
            {pendingProducts.length > 5 && (
              <Typography sx={{ fontSize: 13, color: 'primary.main', textAlign: 'center', pt: 1 }}>
                + {pendingProducts.length - 5} {t('items')}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25 }}>
          <Button
            onClick={() => {
              const message = generateShareListMessage(list, t);
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
            }}
            fullWidth
            sx={{ bgcolor: BRAND_COLORS.whatsapp, color: 'white', '&:hover': { bgcolor: BRAND_COLORS.whatsappHover }, gap: 1 }}
            aria-label="WhatsApp"
          >
            <WhatsAppIcon />
          </Button>
          <Button variant="outlined" fullWidth onClick={handleCopy} aria-label={t('copy')}>
            📋 {t('copy')}
          </Button>
        </Box>
      </Box>
    </>
  );
});

ShareListModal.displayName = 'ShareListModal';

// ===== מודאל עריכת רשימה =====
interface EditListModalProps {
  isOpen: boolean;
  list: List;
  editData: EditListForm | null;
  hasChanges: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateData: (data: EditListForm) => void;
  onConvertToGroup?: (password: string) => void | Promise<void>;
  onConvertToPrivate?: () => void | Promise<void>;
  onChangePassword?: (password: string) => void | Promise<void>;
}

export const EditListModal = memo(({
  isOpen,
  list,
  editData,
  hasChanges,
  saving = false,
  onClose,
  onSave,
  onUpdateData,
  onConvertToGroup,
  onConvertToPrivate,
  onChangePassword
}: EditListModalProps) => {
  const { t } = useSettings();
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [convertPassword, setConvertPassword] = useState('');
  const [converting, setConverting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // איפוס state מקומי כשהמודאל נסגר
  useEffect(() => {
    if (!isOpen) {
      setShowPasswordStep(false);
      setConvertPassword('');
      setConverting(false);
    }
  }, [isOpen]);

  if (!isOpen || !editData) return null;

  const icons = list.isGroup ? GROUP_ICONS : LIST_ICONS;

  return (
    <Modal title={list.isGroup ? t('editGroup') : t('editList')} onClose={() => !saving && !converting && onClose()}>
      {/* Icon Preview */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
        <Box sx={{
          width: 60,
          height: 60,
          borderRadius: '14px',
          bgcolor: editData.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          boxShadow: `0 4px 12px ${editData.color}40`,
          transition: 'all 0.2s ease'
        }}>
          {editData.icon}
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography sx={labelSx}>{t('name')}</Typography>
        <TextField
          autoFocus
          fullWidth
          value={editData.name}
          onChange={e => onUpdateData({ ...editData, name: e.target.value })}
          size="small"
        />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography sx={labelSx}>{t('icon')}</Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }} role="radiogroup" aria-label={t('icon')}>
          {icons.map(i => (
            <Box
              key={i}
              onClick={() => onUpdateData({ ...editData, icon: i })}
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: editData.icon === i ? 'primary.main' : 'transparent',
                bgcolor: editData.icon === i ? 'primary.light' : 'action.hover',
                transition: 'all 0.15s ease',
                '&:active': { transform: 'scale(0.92)' }
              }}
              role="radio"
              aria-checked={editData.icon === i}
              aria-label={i}
            >
              {i}
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={labelSx}>{t('color')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} role="radiogroup" aria-label={t('color')}>
          {LIST_COLORS.map(c => (
            <Box
              key={c}
              onClick={() => onUpdateData({ ...editData, color: c })}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: c,
                cursor: 'pointer',
                border: '3px solid',
                borderColor: editData.color === c ? 'text.primary' : 'transparent',
                transition: 'all 0.15s ease',
                '&:active': { transform: 'scale(0.9)' }
              }}
              role="radio"
              aria-checked={editData.color === c}
              aria-label={c}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onUpdateData({ ...editData, color: c })}
            />
          ))}
        </Box>
      </Box>
      {/* שינוי סיסמה - מעל כפתור שמירה, נפתח בלחיצה */}
      {list.isGroup && onChangePassword && (
        <>
          <Box
            onClick={() => setShowChangePassword(!showChangePassword)}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              py: 1.25, px: 0.5, cursor: 'pointer', mb: showChangePassword ? 0 : 2,
              '&:active': { opacity: 0.7 },
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
              🔑 {t('password')}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'primary.main', fontWeight: 600 }}>
              {showChangePassword ? '▲' : '▼'}
            </Typography>
          </Box>
          {showChangePassword && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  size="small"
                  fullWidth
                  inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 18, fontWeight: 700, letterSpacing: 6 } }}
                />
                <Button
                  variant="outlined"
                  disabled={newPassword.length !== 4 || newPassword === (list.password || '') || savingPassword}
                  onClick={async () => {
                    setSavingPassword(true);
                    try {
                      await onChangePassword(newPassword);
                      setNewPassword('');
                      setShowChangePassword(false);
                    } finally {
                      setSavingPassword(false);
                    }
                  }}
                  sx={{ minWidth: 80, fontSize: 13, fontWeight: 600 }}
                >
                  {savingPassword ? <CircularProgress size={18} /> : t('save')}
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
      <Button variant="contained" fullWidth onClick={() => { haptic('medium'); onSave(); }} disabled={!hasChanges || saving} sx={{ py: 1.25, fontSize: 15 }}>
        {saving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('saveChanges')}
      </Button>
      {!list.isGroup && onConvertToGroup && !showPasswordStep && (
        <Box
          onClick={() => setShowPasswordStep(true)}
          sx={{
            mt: 2.5,
            p: 1.5,
            borderRadius: '12px',
            bgcolor: 'rgba(20, 184, 166, 0.06)',
            border: '1.5px dashed',
            borderColor: 'rgba(20, 184, 166, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            transition: 'all 0.15s ease',
            '&:active': { transform: 'scale(0.98)', bgcolor: 'rgba(20, 184, 166, 0.12)' }
          }}
        >
          <Box sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: 'rgba(20, 184, 166, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0
          }}>
            👥
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main', lineHeight: 1.3 }}>
              {t('convertToGroup')}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>
              {t('convertToGroupHint')}
            </Typography>
          </Box>
        </Box>
      )}
      {!list.isGroup && onConvertToGroup && showPasswordStep && (
        <Box sx={{ mt: 2.5, p: 2, borderRadius: '12px', bgcolor: 'rgba(20, 184, 166, 0.06)', border: '1.5px solid', borderColor: 'primary.main' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main', mb: 1.5 }}>
            {t('setGroupPassword')}
          </Typography>
          <TextField
            fullWidth
            value={convertPassword}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setConvertPassword(val);
            }}
            placeholder="1234"
            size="small"
            inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 20, fontWeight: 700, letterSpacing: 8 } }}
            sx={{ mb: 1.5 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => { setShowPasswordStep(false); setConvertPassword(''); }}
              disabled={converting}
              sx={{ flex: 1, fontSize: 13 }}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={convertPassword.length !== 4 || converting}
              onClick={async () => {
                setConverting(true);
                try {
                  await onConvertToGroup!(convertPassword);
                } finally {
                  setConverting(false);
                }
              }}
              sx={{ flex: 1, fontSize: 13 }}
            >
              {converting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : t('convertToGroup')}
            </Button>
          </Box>
        </Box>
      )}
      {list.isGroup && onConvertToPrivate && list.members.length === 0 && (
        <Box
          onClick={async () => {
            setConverting(true);
            try {
              await onConvertToPrivate();
            } finally {
              setConverting(false);
            }
          }}
          sx={{
            mt: 2.5,
            p: 1.5,
            borderRadius: '12px',
            bgcolor: 'rgba(99, 102, 241, 0.06)',
            border: '1.5px dashed',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            cursor: converting ? 'default' : 'pointer',
            opacity: converting ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            transition: 'all 0.15s ease',
            '&:active': { transform: 'scale(0.98)', bgcolor: 'rgba(99, 102, 241, 0.12)' }
          }}
        >
          <Box sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0
          }}>
            📝
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#6366F1', lineHeight: 1.3 }}>
              {t('convertToPrivate')}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>
              {t('convertToPrivateHint')}
            </Typography>
          </Box>
        </Box>
      )}
    </Modal>
  );
});

EditListModal.displayName = 'EditListModal';
