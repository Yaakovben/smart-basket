import { memo } from 'react';
import { LoginComponent } from '../components/LoginComponent';

// memo - מונע re-renders של ה-LoginComponent בכל פעם שה-AppRouter מתעדכן
// (notifications, presence). חשוב במיוחד כי Google OAuth widget הוא יקר
// לרינדור-מחדש (מאתחל iframe).
export const LoginPage = memo((props: React.ComponentProps<typeof LoginComponent>) => {
  return <LoginComponent {...props} />;
});
LoginPage.displayName = 'LoginPage';
