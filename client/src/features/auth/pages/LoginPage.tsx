import { LoginComponent } from '../components/LoginComponent';

export const LoginPage = (props: React.ComponentProps<typeof LoginComponent>) => {
  return <LoginComponent {...props} />;
};
