import { memo } from 'react';
import { Box, Typography, Menu, MenuItem, Divider } from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import BookmarksRoundedIcon from '@mui/icons-material/BookmarksRounded';
import { useSettings } from '../context/SettingsContext';
import { menuPaperSx, menuItemSx, menuLabelSx, dividerSx, muteToggleBoxSx, muteToggleLabelSx } from '../styles/ListMenu.styles';

interface ListMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  isGroup: boolean;
  isOwner: boolean;
  isMuted: boolean;
  mainNotificationsOff: boolean;
  onToggleMute: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClearList?: () => void;
  onShoppingMode?: () => void;
  onDuplicate?: () => void;
  onSavedLists?: () => void;
  savedListsIsNew?: boolean;
  hasProducts?: boolean;
  onLeave?: () => void;
  onScanList?: () => void;
  scanListIsNew?: boolean;
  stopPropagation?: boolean;
}

export const ListMenu = memo(({
  anchorEl,
  open,
  onClose,
  isGroup,
  isOwner,
  isMuted,
  mainNotificationsOff,
  onToggleMute,
  onEdit,
  onDelete,
  onShoppingMode,
  onClearList,
  onSavedLists,
  savedListsIsNew = false,
  hasProducts = false,
  onLeave,
  onScanList,
  scanListIsNew = false,
  stopPropagation = false
}: ListMenuProps) => {
  const { t } = useSettings();

  // קיבוץ פריטי התפריט לשלוש קבוצות הגיוניות, עם הפרדה (Divider) רק בין
  // קבוצות ולא בין פריטים בתוך אותה קבוצה: (1) סריקה/מצב קנייה - פעולות
  // "הכנה", (2) רשימות קבועות/ניקוי/עריכה/השתקה - הגדרות רשימה,
  // (3) מחיקה/עזיבה. אין יותר "רענון" בתפריט - יש למשוך מטה (pull-to-refresh).
  const hasGroup1 = !!onScanList || !!(onShoppingMode && hasProducts);
  const hasGroup2 = isGroup || isOwner || !!(onClearList && hasProducts) || !!onSavedLists;
  const hasGroup3 = isOwner || (!isOwner && isGroup && !!onLeave);

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={(e: React.SyntheticEvent) => { if (stopPropagation) e.stopPropagation?.(); onClose(); }}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { sx: menuPaperSx } }}
    >
      {/* סריקת רשימה מהדף (OCR), תמיד ראשון */}
      {onScanList && (
        <MenuItem onClick={() => { onClose(); onScanList(); }} sx={menuItemSx}>
          <DocumentScannerIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={{ ...menuLabelSx, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {t('scanShoppingListMenuItem')}
            {scanListIsNew && (
              <Box component="span" sx={{
                px: 0.7, py: 0.1, borderRadius: '999px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
                color: 'white', fontSize: 9.5, fontWeight: 800, lineHeight: 1.5,
                letterSpacing: 0.2,
              }}>
                חדש
              </Box>
            )}
          </Typography>
        </MenuItem>
      )}

      {/* מצב קנייה - סמוך לסריקה, שתיהן פעולות "הכנה" לפני קנייה */}
      {onShoppingMode && hasProducts && (
        <MenuItem onClick={() => { onClose(); onShoppingMode(); }} sx={menuItemSx}>
          <ShoppingCartCheckoutIcon sx={{ color: '#22C55E', fontSize: 22 }} />
          <Typography sx={menuLabelSx}>
            {t('shoppingMode')}
          </Typography>
        </MenuItem>
      )}

      {/* הפרדה בין קבוצת סריקה/מצב קנייה לקבוצת רשימות קבועות/ניקוי/עריכה/השתקה */}
      {hasGroup1 && hasGroup2 && <Divider sx={dividerSx} />}

      {/* רשימות קבועות - כניסה מאוחדת (הוספת רשימה קיימת / יצירת רשימה חדשה) */}
      {onSavedLists && (
        <MenuItem onClick={() => { onClose(); onSavedLists(); }} sx={menuItemSx}>
          <BookmarksRoundedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={{ ...menuLabelSx, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {t('savedLists')}
            {savedListsIsNew && (
              <Box component="span" sx={{
                px: 0.7, py: 0.1, borderRadius: '999px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
                color: 'white', fontSize: 9.5, fontWeight: 800, lineHeight: 1.5,
                letterSpacing: 0.2,
              }}>
                חדש
              </Box>
            )}
          </Typography>
        </MenuItem>
      )}

      {/* ניקוי רשימה */}
      {onClearList && hasProducts && (
        <MenuItem onClick={() => { onClose(); onClearList(); }} sx={menuItemSx}>
          <PlaylistRemoveIcon sx={{ color: 'warning.main', fontSize: 22 }} />
          <Typography sx={menuLabelSx}>
            {t('clearList')}
          </Typography>
        </MenuItem>
      )}

      {/* עריכה */}
      {isOwner && (
        <MenuItem onClick={() => { onClose(); onEdit(); }} sx={menuItemSx}>
          <EditIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={menuLabelSx}>
            {isGroup ? t('editGroup') : t('editList')}
          </Typography>
        </MenuItem>
      )}

      {/* Mute Toggle, רק בקבוצות - אחרון בקבוצה */}
      {isGroup && (
        <Box sx={{ px: 1.5, py: 0.5 }}>
          <Box
            onClick={() => { if (!mainNotificationsOff) { onClose(); onToggleMute(); } }}
            sx={muteToggleBoxSx(isMuted, mainNotificationsOff)}
          >
            {isMuted || mainNotificationsOff
              ? <VolumeOffIcon sx={{ color: mainNotificationsOff ? 'text.disabled' : 'error.main', fontSize: 22 }} />
              : <VolumeUpIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            }
            <Box sx={{ flex: 1 }}>
              <Typography sx={muteToggleLabelSx(isMuted)}>
                {isMuted ? t('unmuteGroup') : t('muteGroup')}
              </Typography>
              {mainNotificationsOff && (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {t('notificationsOff')}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* הפרדה בין קבוצת רשימות קבועות/ניקוי/עריכה/השתקה לקבוצת מחיקה/עזיבה */}
      {hasGroup2 && hasGroup3 && <Divider sx={dividerSx} />}

      {/* מחיקת רשימה */}
      {isOwner && (
        <MenuItem onClick={() => { onClose(); onDelete(); }} sx={menuItemSx}>
          <DeleteOutlineIcon sx={{ color: 'error.main', fontSize: 22 }} />
          <Typography sx={{ ...menuLabelSx, color: 'error.main' }}>
            {isGroup ? t('deleteGroup') : t('deleteList')}
          </Typography>
        </MenuItem>
      )}

      {/* עזיבת רשימה */}
      {!isOwner && isGroup && onLeave && (
        <MenuItem onClick={() => { onClose(); onLeave(); }} sx={menuItemSx}>
          <LogoutIcon sx={{ color: 'error.main', fontSize: 22 }} />
          <Typography sx={{ ...menuLabelSx, color: 'error.main' }}>
            {t('leaveGroup')}
          </Typography>
        </MenuItem>
      )}
    </Menu>
  );
});

ListMenu.displayName = 'ListMenu';
