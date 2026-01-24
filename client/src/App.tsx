import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './global/theme/theme';
import { AppRouter } from "./router";

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
