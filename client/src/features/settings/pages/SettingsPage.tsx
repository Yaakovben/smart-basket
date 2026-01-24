import type { SettingsPageProps } from '../types/settings-types';
import { SettingsContent } from '../components/SettingsContent';

export const SettingsPage = (props: SettingsPageProps) => {
  return <SettingsContent {...props} />;
};
