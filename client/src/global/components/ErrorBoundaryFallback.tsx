import { Box, Typography, Button, Link, Collapse } from '@mui/material';
import type { Translations } from '../i18n/translations';
import {
  errorScreenSx, errorIconCircleSx, errorTitleSx, errorDescSx,
  actionsColumnSx, actionsRowSx, actionButtonSx, dangerButtonSx,
  toggleDetailsBtnSx, detailsBoxSx, detailsErrorTextSx, detailsStackTextSx,
  detailsButtonsRowSx, copyBtnSx, copyHintSx, supportLinkSx,
} from '../styles/ErrorBoundary.styles';

const SUPPORT_EMAIL = 'smartbasket129@gmail.com';

const supportMailto = (t: Translations, error: Error | null): string => {
  const details = error ? `\n\n---\n${error.name}: ${error.message}` : '';
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t.errorReportEmailSubject)}&body=${encodeURIComponent(t.errorReportEmailBody + details)}`;
};

interface ErrorBoundaryFallbackProps {
  t: Translations;
  error: Error | null;
  showDetails: boolean;
  copied: boolean;
  onReset: () => void;
  onRefresh: () => void;
  onClearCacheAndReload: () => void;
  onToggleDetails: () => void;
  onCopyErrorDetails: () => void;
}

/** מסך שגיאה כללי - מוצג כשלא הוגדר fallback מותאם אישית */
export const ErrorBoundaryFallback = ({
  t, error, showDetails, copied,
  onReset, onRefresh, onClearCacheAndReload, onToggleDetails, onCopyErrorDetails,
}: ErrorBoundaryFallbackProps) => (
  <Box sx={errorScreenSx}>
    <Box sx={errorIconCircleSx}>
      😵
    </Box>
    <Typography variant="h5" sx={errorTitleSx}>
      {t.errorTitle}
    </Typography>
    <Typography sx={errorDescSx}>
      {t.errorDescription}
    </Typography>

    {/* צור קשר עם תמיכה - תמיד גלוי, לא רק אחרי "הצג פרטי שגיאה" */}
    <Link href={supportMailto(t, error)} sx={supportLinkSx}>
      📧 {t.needHelpContactSupport}
    </Link>

    <Box sx={actionsColumnSx}>
      <Box sx={actionsRowSx}>
        <Button variant="outlined" onClick={onReset} sx={actionButtonSx}>
          {t.tryAgain}
        </Button>
        <Button variant="contained" onClick={onRefresh} sx={actionButtonSx}>
          {t.refreshPage}
        </Button>
      </Box>
      <Button variant="contained" onClick={onClearCacheAndReload} sx={dangerButtonSx}>
        {t.clearCacheAndReload}
      </Button>
    </Box>

    {/* פרטי שגיאה לדיווח */}
    <Button variant="text" onClick={onToggleDetails} sx={toggleDetailsBtnSx}>
      {showDetails ? t.hideErrorDetails : t.showErrorDetails}
    </Button>

    <Collapse in={showDetails}>
      <Box sx={detailsBoxSx}>
        <Typography sx={detailsErrorTextSx}>
          {error?.name}: {error?.message}
        </Typography>
        {error?.stack && (
          <Typography sx={detailsStackTextSx}>
            {error.stack.split('\n').slice(0, 5).join('\n')}
          </Typography>
        )}
        <Box sx={detailsButtonsRowSx}>
          <Button variant="outlined" size="small" onClick={onCopyErrorDetails} sx={copyBtnSx}>
            {copied ? t.copiedToClipboard : t.copyErrorDetails}
          </Button>
          <Button variant="outlined" size="small" component="a" href={supportMailto(t, error)} sx={copyBtnSx}>
            {t.emailErrorDetails}
          </Button>
        </Box>
        <Typography sx={copyHintSx}>
          {t.copyAndSendToSupport}
        </Typography>
      </Box>
    </Collapse>
  </Box>
);
