import { memo, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Typography, Button, IconButton, Avatar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import type { List } from '../../../../global/types';
import { haptic, COMMON_STYLES, generateInviteMessage, BRAND_COLORS } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { modalOverlaySx, modalContainerSx } from '../../helpers/listModalStyles';
import { WhatsAppIcon } from './WhatsAppIcon';

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
  const [hasSwitched, setHasSwitched] = useState(false);

  // איפוס טאב/דגל כשהמודאל נסגר - התאמה ל-prop חיצוני (isOpen)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!isOpen) { setTab('text'); setHasSwitched(false); } }, [isOpen]);

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
      <Box
        sx={{
          ...modalContainerSx,
          p: 2.5,
          '@media (max-width: 360px)': { p: 1.75, borderRadius: '16px' },
        }}
        role="dialog"
        aria-labelledby="invite-title"
      >
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'action.hover', zIndex: 1 }} size="small">
          <CloseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        </IconButton>

        <Box sx={{ textAlign: 'center', mb: 1.75, '@media (max-width: 360px)': { mb: 1 } }}>
          <Avatar
            // גודל קבוע בכל המכשירים — תואם לאייקון של ShareListModal (Avatar 64, fontSize 28)
            sx={{
              width: 64, height: 64,
              background: COMMON_STYLES.gradients.header.light,
              mx: 'auto', mb: 1.25,
              boxShadow: '0 8px 24px rgba(20,184,166,0.3)',
              '@media (max-width: 360px)': { mb: 0.5 },
            }}
          >
            <PersonAddIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Typography
            id="invite-title"
            sx={{
              fontSize: 19, fontWeight: 700, color: 'text.primary', lineHeight: 1.2,
              '@media (max-width: 360px)': { fontSize: 15 },
            }}
          >
            {t('inviteFriends')}
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary', fontSize: 13, mt: 0.25,
              '@media (max-width: 360px)': { fontSize: 11 },
            }}
          >
            רשימת: "{list.name}"
          </Typography>
        </Box>

      {(() => {
        const switcher = list.inviteCode ? (
          <Box sx={{ mt: 2.25, display: 'flex', justifyContent: 'center', '@media (max-width: 360px)': { mt: 1.75 } }}>
            <Box
              component="button"
              onClick={() => { haptic('light'); setHasSwitched(true); setTab(tab === 'text' ? 'qr' : 'text'); }}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: 0,
                py: 0.25,
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                font: 'inherit',
                transition: 'opacity 0.2s ease',
                '&:hover .sw-text': { opacity: 1, textDecorationColor: 'currentColor' },
                '&:active': { opacity: 0.7 }
              }}
            >
              {tab === 'text' ? (
                <QrCode2Icon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.7 }} />
              ) : (
                <VpnKeyOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.7 }} />
              )}
              <Typography
                className="sw-text"
                sx={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: 'text.secondary',
                  opacity: 0.75,
                  textDecoration: 'underline',
                  textDecorationColor: 'rgba(0,0,0,0.15)',
                  textDecorationStyle: 'dotted',
                  textUnderlineOffset: '3px',
                  transition: 'opacity 0.2s ease',
                }}
              >
                {tab === 'text' ? 'הצג QR' : 'חזור לקוד וסיסמה'}
              </Typography>
            </Box>
          </Box>
        ) : null;
        return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {tab === 'text' ? (
          <Box key="text" sx={{
            display: 'flex', flexDirection: 'column',
            animation: hasSwitched ? 'slideInUp 0.45s cubic-bezier(0.23, 1, 0.32, 1)' : 'none',
            '@keyframes slideInUp': {
              from: { transform: 'translateY(100%)', opacity: 0 },
              to: { transform: 'translateY(0)', opacity: 1 },
            },
          }}>
            {/* קוד + סיסמה - גובה טבעי */}
            <Box sx={{
              background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(20,184,166,0.04))',
              borderRadius: '16px',
              border: '1.5px solid rgba(20,184,166,0.2)',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: list.password ? '1px solid rgba(20,184,166,0.15)' : 'none', '@media (max-width: 360px)': { px: 1.5, py: 1 } }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 600, '@media (max-width: 360px)': { fontSize: 11 } }}>{t('groupCode')}</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'primary.main', letterSpacing: 3, fontFamily: 'monospace', '@media (max-width: 360px)': { fontSize: 16, letterSpacing: 2 } }}>{list.inviteCode}</Typography>
              </Box>
              {list.password && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, '@media (max-width: 360px)': { px: 1.5, py: 1 } }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 600, '@media (max-width: 360px)': { fontSize: 11 } }}>{t('password')}</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'primary.main', letterSpacing: 3, fontFamily: 'monospace', '@media (max-width: 360px)': { fontSize: 16, letterSpacing: 2 } }}>{list.password}</Typography>
                </Box>
              )}
            </Box>
            {/* כפתורים */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button
                aria-label="WhatsApp"
                onClick={() => {
                  const msg = generateInviteMessage(list, t);
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                fullWidth disableRipple disableFocusRipple
                sx={{
                  background: `linear-gradient(135deg, ${BRAND_COLORS.whatsapp}, ${BRAND_COLORS.whatsappHover}) !important`,
                  color: 'white',
                  '&:hover, &:focus, &:focus-visible, &.Mui-focusVisible': {
                    background: `linear-gradient(135deg, ${BRAND_COLORS.whatsapp}, ${BRAND_COLORS.whatsappHover}) !important`,
                    boxShadow: '0 3px 12px rgba(37,211,102,0.28)',
                  },
                  '&:active': { opacity: 0.85 },
                  borderRadius: '12px', height: 44,
                  boxShadow: '0 3px 12px rgba(37,211,102,0.28)',
                  transition: 'opacity 0.1s',
                  '@media (max-width: 360px)': { height: 40, borderRadius: '11px' },
                }}
              >
                <WhatsAppIcon />
              </Button>
              <Button
                fullWidth disableRipple disableFocusRipple onClick={handleCopy} startIcon={<ContentCopyIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #14B8A6, #0D9488) !important',
                  color: 'white',
                  '&:hover, &:focus, &:focus-visible, &.Mui-focusVisible': {
                    background: 'linear-gradient(135deg, #14B8A6, #0D9488) !important',
                    boxShadow: '0 3px 12px rgba(20,184,166,0.28)',
                  },
                  '&:active': { opacity: 0.85 },
                  borderRadius: '12px', height: 44, textTransform: 'none', fontWeight: 700, fontSize: 13.5,
                  boxShadow: '0 3px 12px rgba(20,184,166,0.28)',
                  transition: 'opacity 0.1s',
                  // אייקון בגודל קבוע 20x20 בכל המכשירים — תואם ל-WhatsAppIcon באותו פופאפ
                  '& .MuiButton-startIcon': { marginInlineStart: 0, marginInlineEnd: '10px', '& svg': { width: 20, height: 20, fontSize: 20 } },
                  '@media (max-width: 360px)': {
                    height: 40, fontSize: 12, borderRadius: '11px',
                    '& .MuiButton-startIcon': { marginInlineEnd: '6px' },
                  },
                }}
              >
                העתק
              </Button>
            </Box>
            {switcher}
          </Box>
        ) : (
          <Box key="qr" sx={{
            display: 'flex', flexDirection: 'column',
            animation: 'slideInDown 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
            '@keyframes slideInDown': {
              from: { transform: 'translateY(-100%)', opacity: 0 },
              to: { transform: 'translateY(0)', opacity: 1 },
            },
          }}>
            {/* QR - גובה טבעי */}
            <Box
              id="qr-container"
              sx={{
                background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(20,184,166,0.04))',
                borderRadius: '16px',
                border: '1.5px solid rgba(20,184,166,0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 2,
                '@media (max-width: 360px)': { py: 1 },
              }}
            >
              <Box sx={{
                p: 1.25,
                borderRadius: '12px',
                bgcolor: 'white',
                boxShadow: '0 4px 16px rgba(20,184,166,0.18)',
                '@media (max-width: 360px)': { p: 0.5, borderRadius: '8px' },
              }}>
                <QRCodeSVG
                  value={`${window.location.origin}/join?code=${list.inviteCode}&password=${list.password || ''}`}
                  size={window.innerWidth <= 360 ? 95 : 130}
                  level="H"
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                  style={{ display: 'block' }}
                />
              </Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.75, fontWeight: 500, '@media (max-width: 360px)': { fontSize: 10, mt: 0.25 } }}>
                סרוק להצטרפות מיידית
              </Typography>
            </Box>
            {/* כפתורים */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Button
                aria-label="שלח QR"
                fullWidth disableRipple disableFocusRipple onClick={handleShareQR}
                sx={{
                  background: `linear-gradient(135deg, ${BRAND_COLORS.whatsapp}, ${BRAND_COLORS.whatsappHover}) !important`,
                  color: 'white',
                  '&:hover, &:focus, &:focus-visible, &.Mui-focusVisible': {
                    background: `linear-gradient(135deg, ${BRAND_COLORS.whatsapp}, ${BRAND_COLORS.whatsappHover}) !important`,
                    boxShadow: '0 3px 12px rgba(37,211,102,0.28)',
                  },
                  '&:active': { opacity: 0.85 },
                  borderRadius: '12px', height: 44,
                  boxShadow: '0 3px 12px rgba(37,211,102,0.28)',
                  transition: 'opacity 0.1s',
                  '@media (max-width: 360px)': { height: 40, borderRadius: '11px' },
                }}
              >
                <WhatsAppIcon />
              </Button>
              <Button
                fullWidth disableRipple disableFocusRipple
                startIcon={<DownloadIcon />}
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
                    canvas.toBlob(async blob => {
                      if (!blob) return;
                      const fileName = `${list.name}-qr.png`;
                      const file = new File([blob], fileName, { type: 'image/png' });
                      // פותח share sheet כדי שהמשתמש יוכל לבחור "שמור בתמונות" ולהגיע לגלריה
                      if (navigator.canShare?.({ files: [file] })) {
                        try {
                          await navigator.share({ files: [file], title: `QR - ${list.name}` });
                          return;
                        } catch {
                          // המשתמש ביטל — לא צריך fallback כי הוא בחר לא לשמור
                          return;
                        }
                      }
                      // דסקטופ או דפדפן ישן — download קלאסי
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = fileName;
                      a.click();
                      showToast(t('saved'));
                    }, 'image/png');
                  };
                  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                }}
                sx={{
                  background: 'linear-gradient(135deg, #14B8A6, #0D9488) !important',
                  color: 'white',
                  '&:hover, &:focus, &:focus-visible, &.Mui-focusVisible': {
                    background: 'linear-gradient(135deg, #14B8A6, #0D9488) !important',
                    boxShadow: '0 3px 12px rgba(20,184,166,0.28)',
                  },
                  '&:active': { opacity: 0.85 },
                  borderRadius: '12px', height: 44, textTransform: 'none', fontWeight: 700, fontSize: 13.5,
                  boxShadow: '0 3px 12px rgba(20,184,166,0.28)',
                  transition: 'opacity 0.1s',
                  // אייקון בגודל קבוע 20x20 בכל המכשירים — תואם ל-WhatsAppIcon באותו פופאפ
                  '& .MuiButton-startIcon': { marginInlineStart: 0, marginInlineEnd: '10px', '& svg': { width: 20, height: 20, fontSize: 20 } },
                  '@media (max-width: 360px)': {
                    height: 40, fontSize: 12, borderRadius: '11px',
                    '& .MuiButton-startIcon': { marginInlineEnd: '6px' },
                  },
                }}
              >
                שמור
              </Button>
            </Box>
            {switcher}
          </Box>
        )}
      </Box>
        );
      })()}
      </Box>
    </>
  );
});

InviteModal.displayName = 'InviteModal';
