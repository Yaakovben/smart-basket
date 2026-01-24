import type { LoginPageProps } from '../types/auth-types';
import { LoginContent } from '../components/LoginContent';

export const LoginPage = (props: LoginPageProps) => {
  return <LoginContent {...props} />;
};
