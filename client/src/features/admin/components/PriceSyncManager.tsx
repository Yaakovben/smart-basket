/**
 * PriceSyncManager - ניהול מאגר מחירים וסניפים
 *
 * עמוד אחד, פשוט ונקי:
 *  1. סיכום: כמה מחירים, כמה סניפים, מתי עודכן
 *  2. כפתור אחד: 'רענן עכשיו' (מחירים + סניפים יחד)
 *  3. רשימת רשתות: לחיצה על שורה מציגה את הסניפים שלה
 */

import { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PlaceIcon from '@mui/icons-material/Place';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Modal, ShimmerList, ShimmerBlock } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { usePriceSyncStatus } from '../hooks/usePriceSyncStatus';
import { useChainBranches } from '../hooks/useChainBranches';
import { useBulkImport } from '../hooks/useBulkImport';
import { useChainStatusFilter } from '../hooks/useChainStatusFilter';
import { formatAge } from '../helpers/priceSyncHelpers';
import { PriceSyncStatCard } from './PriceSyncStatCard';
import { PriceSyncSourceBreakdown } from './PriceSyncSourceBreakdown';
import { PriceSyncProgressBanner } from './PriceSyncProgressBanner';
import { PriceSyncRefreshActions } from './PriceSyncRefreshActions';
import { PriceSyncBulkImportForm } from './PriceSyncBulkImportForm';
import { PriceSyncFeedbackBanner } from './PriceSyncFeedbackBanner';
import { PriceSyncStatusFilterBar } from './PriceSyncStatusFilterBar';
import { PriceSyncChainList } from './PriceSyncChainList';
import { PriceSyncHelpModal } from './PriceSyncHelpModal';

interface Props {
  onClose: () => void;
}

export const PriceSyncManager = ({ onClose }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [showHelp, setShowHelp] = useState(false);

  const {
    status, loading, feedback, setFeedback, load, syncActive, handleRefresh,
    totalPrices, chains, totalBranches, totalBranchesWithCoords,
  } = usePriceSyncStatus();

  const {
    expandedChain, chainBranches, loadingChain,
    addingBranch, setAddingBranch, newBranch, setNewBranch,
    handleAddBranch, handleDeleteBranch, toggleChain, handleCleanup, resetChainBranches,
  } = useChainBranches({ setFeedback, load });

  const {
    bulkOpen, setBulkOpen, bulkText, setBulkText, bulkChainId, setBulkChainId, bulkLoading, handleBulkImport,
  } = useBulkImport({ setFeedback, load, resetChainBranches });

  const { statusFilter, setStatusFilter, filteredChains, errorCount, noBranchCount, noPriceCount } = useChainStatusFilter(chains);

  return (
    <Modal title="ניהול מאגר" onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: '100%', overflowX: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, py: 1 }}>
            <ShimmerBlock height={56} radius={12} />
            <ShimmerList count={6} rowHeight={52} gap={8} />
          </Box>
        ) : (
          <>
            {/* ===== כרטיסי סיכום: מחירים + סניפים + סניפים עם מיקום ===== */}
            {/* גלילה אופקית רק על הכרטיסים הללו; שאר הדף לא גולל הצידה. */}
            <Box sx={{
              display: 'flex', gap: 1,
              overflowX: 'auto', overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
              mx: -2.5, px: 2.5,
            }}>
              <PriceSyncStatCard
                icon={<StorefrontIcon sx={{ fontSize: 14, color: '#0D9488' }} />}
                value={totalPrices.toLocaleString('he-IL')}
                label="מחירים"
                color="#14B8A6"
                isDark={isDark}
              />
              <PriceSyncStatCard
                icon={<PlaceIcon sx={{ fontSize: 14, color: '#0D9488' }} />}
                value={totalBranches.toLocaleString('he-IL')}
                label="סניפים"
                color="#14B8A6"
                isDark={isDark}
              />
              <PriceSyncStatCard
                icon={<PlaceIcon sx={{ fontSize: 14, color: '#0D9488' }} />}
                value={`${totalBranchesWithCoords}/${totalBranches}`}
                label="עם מיקום"
                color="#14B8A6"
                isDark={isDark}
              />
            </Box>

            {/* מתי עודכן + כפתור עזרה */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'text.secondary' }}>
              <ScheduleIcon sx={{ fontSize: 13 }} />
              <Typography sx={{ fontSize: 11.5 }}>
                עודכן {formatAge(status?.ageHours ?? null, status?.lastUpdatedISO)}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setShowHelp(true)}
                sx={{ ml: 0.5, p: 0.25, color: '#0D9488' }}
                aria-label="הסבר מפורט על המאגר"
                title="איך פועל המאגר? - הסבר לאדמין"
              >
                <HelpOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {/* ===== פיזור מקורות הסניפים - מידע מפורט לאדמין ===== */}
            {status?.branchSourceBreakdown && (
              <PriceSyncSourceBreakdown breakdown={status.branchSourceBreakdown} isDark={isDark} />
            )}

            {/* ===== באנר פרוגרס בזמן סנכרון פעיל ===== */}
            {syncActive && <PriceSyncProgressBanner status={status} isDark={isDark} />}

            {/* ===== כפתור יחיד מרכזי + ניקוי seed ===== */}
            {!syncActive && (
              <>
                <PriceSyncRefreshActions
                  onRefresh={handleRefresh}
                  onToggleBulk={() => setBulkOpen(v => !v)}
                  onCleanup={handleCleanup}
                />

                {/* טופס ייבוא המוני */}
                {bulkOpen && (
                  <PriceSyncBulkImportForm
                    chains={chains}
                    bulkChainId={bulkChainId}
                    setBulkChainId={setBulkChainId}
                    bulkText={bulkText}
                    setBulkText={setBulkText}
                    bulkLoading={bulkLoading}
                    isDark={isDark}
                    onImport={handleBulkImport}
                    onCancel={() => { setBulkOpen(false); setBulkText(''); }}
                  />
                )}
              </>
            )}

            {/* פידבק */}
            {feedback && <PriceSyncFeedbackBanner feedback={feedback} />}

            {/* ===== פילטר רשתות לפי סטטוס - לזיהוי מהיר של בעיות ===== */}
            {chains.length > 0 && (errorCount > 0 || noBranchCount > 0 || noPriceCount > 0) && (
              <PriceSyncStatusFilterBar
                chains={chains}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                errorCount={errorCount}
                noBranchCount={noBranchCount}
                noPriceCount={noPriceCount}
                isDark={isDark}
              />
            )}

            {/* ===== רשימת רשתות ===== */}
            <PriceSyncChainList
              chains={chains}
              filteredChains={filteredChains}
              isDark={isDark}
              expandedChain={expandedChain}
              loadingChain={loadingChain}
              chainBranches={chainBranches}
              addingBranch={addingBranch}
              newBranch={newBranch}
              setNewBranch={setNewBranch}
              onToggleChain={toggleChain}
              onToggleAddBranch={(chainId) => setAddingBranch(addingBranch === chainId ? null : chainId)}
              onSaveBranch={handleAddBranch}
              onCancelAddBranch={() => setAddingBranch(null)}
              onDeleteBranch={handleDeleteBranch}
              onShowAllFilter={() => setStatusFilter('all')}
            />

            {/* הסבר קומפקטי */}
            <Typography sx={{ fontSize: 10, color: 'text.disabled', textAlign: 'center', lineHeight: 1.5, mt: 0.5 }}>
              סנכרון אוטומטי פעם ביום ב-04:00. כפתור 'רענן עכשיו' מחזיק מחירים + סניפים במקביל.
            </Typography>
          </>
        )}
      </Box>
      {showHelp && <PriceSyncHelpModal onClose={() => setShowHelp(false)} isDark={isDark} />}
    </Modal>
  );
};
