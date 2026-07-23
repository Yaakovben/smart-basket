// ===== סגנונות משותפים למודאלים מסוג "custom overlay" (הזמנה/שיתוף רשימה) =====
export const modalOverlaySx = {
  position: 'fixed',
  inset: 0,
  bgcolor: 'rgba(0,0,0,0.5)',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
  touchAction: 'none'
};

export const modalContainerSx = {
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
