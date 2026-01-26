import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ConsentBanner } from "./global/components";

const ThemedApp = () => {
  const { settings } = useSettings();

  const theme = useMemo(() =>
    createAppTheme(settings.theme, settings.language),
    [settings.theme, settings.language]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRouter />
        <ConsentBanner />
      </BrowserRouter>
    </ThemeProvider>
  );
};

const App = () => (
  <SettingsProvider>   
    <ThemedApp />
  </SettingsProvider>
);




export default App;
