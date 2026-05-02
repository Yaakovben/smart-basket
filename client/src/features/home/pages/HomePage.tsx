import { memo } from 'react';
import { HomeComponent } from '../components/HomeComponent';

// memo - חוסם re-renders של ה-HomeComponent כשה-router מתעדכן (presence,
// socket, notifications) אבל ה-props של ההום לא השתנו בפועל.
export const HomePage = memo((props: React.ComponentProps<typeof HomeComponent>) => {
  return <HomeComponent {...props} />;
});
HomePage.displayName = 'HomePage';
