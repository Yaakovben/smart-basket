// הסתרת מסך הטעינה הראשוני - הסרה מיידית בלי fade כדי לחסוך 300ms של המתנה
export const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.remove();
    document.body.classList.add('app-loaded');
  }
};
