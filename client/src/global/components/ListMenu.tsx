import { memo } from 'react';
import { Box, Typography, Menu, MenuItem, Divider } from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
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
  onRefresh?: () => void;
  onClearList?: () => void;
  onShoppingMode?: () => void;
  onDuplicate?: () => void;
  hasProducts?: boolean;
  onLeave?: () => void;
  onScanList?: () => void;
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
  onRefresh,
  onShoppingMode,
  onClearList,
  hasProducts = false,
  onLeave,
  onScanList,
  stopPropagation = false
}: ListMenuProps) => {
  const { t } = useSettings();

  // קיבוץ פריטי התפריט לשלוש קבוצות הגיוניות, עם הפרדה (Divider) רק בין
  // קבוצות ולא בין פריטים בתוך אותה קבוצה: (1) רענון/מצב קנייה/סריקה,
  // (2) השתקה/עריכה/ניקוי, (3) מחיקה/עזיבה.
  const hasGroup1 = !!onRefresh || !!(onShoppingMode && hasProducts) || !!onScanList;
  const hasGroup2 = isGroup || isOwner || !!(onClearList && hasProducts);
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
      {/* רענן, תמיד ראשון */}
      {onRefresh && (
        <MenuItem onClick={() => { onClose(); onRefresh(); }} sx={menuItemSx}>
          <RefreshIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={menuLabelSx}>
            {t('refresh')}
          </Typography>
        </MenuItem>
      )}

      {/* מצב קנייה */}
      {onShoppingMode && hasProducts && (
        <MenuItem onClick={() => { onClose(); onShoppingMode(); }} sx={menuItemSx}>
          <ShoppingCartCheckoutIcon sx={{ color: '#22C55E', fontSize: 22 }} />
          <Typography sx={menuLabelSx}>
            {t('shoppingMode')}
          </Typography>
        </MenuItem>
      )}

      {/* סריקת רשימה מהדף (OCR) */}
      {onScanList && (
        <MenuItem onClick={() => { onClose(); onScanList(); }} sx={menuItemSx}>
          <DocumentScannerIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={menuLabelSx}>
            {t('scanShoppingListMenuItem')}
          </Typography>
        </MenuItem>
      )}

      {/* הפרדה בין קבוצת רענון/סריקה לקבוצת השתקה/עריכה/ניקוי */}
      {hasGroup1 && hasGroup2 && <Divider sx={dividerSx} />}

      {/* Mute Toggle, רק בקבוצות */}
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

      {/* עריכה */}
      {isOwner && (
        <MenuItem onClick={() => { onClose(); onEdit(); }} sx={menuItemSx}>
          <EditIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography sx={menuLabelSx}>
            {isGroup ? t('editGroup') : t('editList')}
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

      {/* הפרדה בין קבוצת השתקה/עריכה/ניקוי לקבוצת מחיקה/עזיבה */}
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
