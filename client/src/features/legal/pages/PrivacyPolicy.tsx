import { memo } from 'react';
import { Box, Typography, IconButton, Paper, Divider } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', mb: 0.75, mt: 2.5 }}>
    {children}
  </Typography>
);

const SectionText = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ color: 'text.secondary', lineHeight: 1.8, fontSize: 13.5 }}>
    {children}
  </Typography>
);

const SectionDivider = () => (
  <Divider sx={{ my: 3, borderColor: 'divider' }} />
);

export const PrivacyPolicy = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const { language } = settings;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
        p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' },
        borderRadius: '0 0 24px 24px'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            aria-label={t('back')}
          >
            {language === 'he' ? <ArrowForwardIcon /> : <ArrowBackIcon />}
          </IconButton>
          <Typography sx={{ color: 'white', fontSize: 20, fontWeight: 700 }}>
            {t('termsAndPrivacy')}
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        <Paper sx={{ p: 3, borderRadius: '16px' }}>
          {language === 'he' ? (
            <>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 2 }}>
                גרסה אחרונה: מרץ 2026
              </Typography>

              <SectionText>
                מסמך זה מפרט את תנאי השימוש ומדיניות הפרטיות של Smart Basket. השימוש באפליקציה מהווה הסכמה לתנאים המפורטים להלן.
              </SectionText>

              {/* תנאי שימוש */}
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mt: 3, mb: 0.5 }}>
                תנאי שימוש
              </Typography>

              <SectionTitle>1. תיאור השירות</SectionTitle>
              <SectionText>
                Smart Basket הינה פלטפורמה לניהול רשימות קניות, המאפשרת יצירה, עריכה ושיתוף של רשימות עם משתמשים נוספים. השירות מסופק ללא תשלום לשימוש אישי ומשפחתי.
              </SectionText>

              <SectionTitle>2. חשבון והרשמה</SectionTitle>
              <SectionText>
                המשתמש אחראי לשמירה על סודיות פרטי ההתחברות שלו ולדיוק המידע שנמסר בעת ההרשמה. יש לדווח מיידית על כל חשד לשימוש בלתי מורשה בחשבון.
              </SectionText>

              <SectionTitle>3. מדיניות שימוש</SectionTitle>
              <SectionText>
                השימוש באפליקציה מותר למטרות חוקיות בלבד. חל איסור מוחלט על פגיעה בשירות, העלאת תוכן פוגעני או בלתי חוקי, וניסיון גישה למערכות ללא הרשאה מתאימה.
              </SectionText>

              <SectionTitle>4. קניין רוחני</SectionTitle>
              <SectionText>
                כלל הזכויות באפליקציה, לרבות עיצוב, קוד ומותג, שמורות ל-Smart Basket. התוכן שנוצר על ידי המשתמש נשאר בבעלותו המלאה.
              </SectionText>

              <SectionTitle>5. הגבלת אחריות</SectionTitle>
              <SectionText>
                השירות מסופק במתכונת "AS IS" ללא כל מצג או התחייבות. Smart Basket אינה נושאת באחריות לנזקים עקיפים או תוצאתיים. החברה פועלת לשמירה על זמינות השירות אך אינה מתחייבת לרציפות מלאה.
              </SectionText>

              <SectionTitle>6. סיום שימוש</SectionTitle>
              <SectionText>
                המשתמש רשאי למחוק את חשבונו בכל עת דרך ההגדרות. Smart Basket שומרת לעצמה את הזכות להשעות חשבונות המפרים תנאים אלה.
              </SectionText>

              <SectionDivider />

              {/* מדיניות פרטיות */}
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                מדיניות פרטיות
              </Typography>

              <SectionTitle>7. איסוף מידע</SectionTitle>
              <SectionText>
                במסגרת השירות נאסף המידע הבא:{'\n'}
                • <strong>פרטי חשבון:</strong> שם, כתובת דוא"ל וסיסמה מוצפנת{'\n'}
                • <strong>תוכן:</strong> רשימות קניות, פריטים וקבוצות{'\n'}
                • <strong>העדפות:</strong> שפה, ערכת נושא והתראות{'\n'}
                • <strong>נתוני אבטחה:</strong> זמני התחברות ומידע טכני בסיסי
              </SectionText>

              <SectionTitle>8. שימוש במידע</SectionTitle>
              <SectionText>
                המידע משמש אך ורק לצורך תפעול השירות, שיתוף רשימות עם משתמשים מורשים, שליחת התראות רלוונטיות ושיפור חווית המשתמש.
              </SectionText>

              <SectionTitle>9. שיתוף עם צדדים שלישיים</SectionTitle>
              <SectionText>
                <strong>Smart Basket אינה מוכרת מידע אישי.</strong> מידע מועבר אך ורק למשתמשים ברשימות משותפות (שם בלבד) ולספקי תשתית הכרחיים (אחסון, אימות).
              </SectionText>

              <SectionTitle>10. אבטחת מידע</SectionTitle>
              <SectionText>
                מיושמים אמצעי אבטחה מקובלים בתעשייה, לרבות הצפנת סיסמאות, תקשורת מוצפנת (HTTPS) ובקרת גישה מוקפדת.
              </SectionText>

              <SectionTitle>11. זכויות המשתמש</SectionTitle>
              <SectionText>
                למשתמש עומדות הזכויות הבאות: צפייה בפרטי החשבון, עדכון מידע אישי ומחיקת החשבון על כל המידע הנלווה באופן בלתי הפיך.
              </SectionText>

              <SectionDivider />

              <SectionTitle>12. עדכונים</SectionTitle>
              <SectionText>
                Smart Basket רשאית לעדכן מסמך זה מעת לעת. שינויים מהותיים יפורסמו באפליקציה. המשך השימוש לאחר עדכון מהווה הסכמה לנוסח המעודכן.
              </SectionText>

              <SectionTitle>13. יצירת קשר</SectionTitle>
              <SectionText>
                לכל שאלה בנושא תנאי השימוש או מדיניות הפרטיות, ניתן לפנות דרך "עזרה ותמיכה" בהגדרות האפליקציה.
              </SectionText>
            </>
          ) : language === 'ru' ? (
            <>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 2 }}>
                Последнее обновление: март 2026
              </Typography>

              <SectionText>
                Настоящий документ определяет условия использования и политику конфиденциальности Smart Basket. Использование приложения означает согласие с изложенными ниже условиями.
              </SectionText>

              {/* Условия использования */}
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mt: 3, mb: 0.5 }}>
                Условия использования
              </Typography>

              <SectionTitle>1. Описание сервиса</SectionTitle>
              <SectionText>
                Smart Basket — платформа для управления списками покупок, позволяющая создавать, редактировать и делиться списками с другими пользователями. Сервис предоставляется бесплатно для личного и семейного использования.
              </SectionText>

              <SectionTitle>2. Аккаунт и регистрация</SectionTitle>
              <SectionText>
                Пользователь несёт ответственность за сохранение конфиденциальности учётных данных и достоверность информации, предоставленной при регистрации. О любом подозрении на несанкционированный доступ необходимо сообщить немедленно.
              </SectionText>

              <SectionTitle>3. Правила использования</SectionTitle>
              <SectionText>
                Приложение допускается использовать исключительно в законных целях. Строго запрещается нарушать работу сервиса, загружать оскорбительный или незаконный контент, а также пытаться получить несанкционированный доступ к системам.
              </SectionText>

              <SectionTitle>4. Интеллектуальная собственность</SectionTitle>
              <SectionText>
                Все права на приложение, включая дизайн, код и бренд, принадлежат Smart Basket. Контент, созданный пользователем, остаётся его полной собственностью.
              </SectionText>

              <SectionTitle>5. Ограничение ответственности</SectionTitle>
              <SectionText>
                Сервис предоставляется «как есть» (AS IS) без каких-либо гарантий. Smart Basket не несёт ответственности за косвенные или побочные убытки. Компания стремится поддерживать доступность сервиса, но не гарантирует непрерывную работу.
              </SectionText>

              <SectionTitle>6. Прекращение использования</SectionTitle>
              <SectionText>
                Пользователь вправе удалить свой аккаунт в любое время через настройки. Smart Basket оставляет за собой право приостановить аккаунты, нарушающие данные условия.
              </SectionText>

              <SectionDivider />

              {/* Политика конфиденциальности */}
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                Политика конфиденциальности
              </Typography>

              <SectionTitle>7. Сбор информации</SectionTitle>
              <SectionText>
                В рамках сервиса собирается следующая информация:{'\n'}
                • <strong>Данные аккаунта:</strong> имя, адрес электронной почты и зашифрованный пароль{'\n'}
                • <strong>Контент:</strong> списки покупок, товары и группы{'\n'}
                • <strong>Настройки:</strong> язык, тема оформления и уведомления{'\n'}
                • <strong>Данные безопасности:</strong> время входа и базовая техническая информация
              </SectionText>

              <SectionTitle>8. Использование информации</SectionTitle>
              <SectionText>
                Информация используется исключительно для работы сервиса, обмена списками с авторизованными пользователями, отправки соответствующих уведомлений и улучшения пользовательского опыта.
              </SectionText>

              <SectionTitle>9. Передача третьим лицам</SectionTitle>
              <SectionText>
                <strong>Smart Basket не продаёт персональные данные.</strong> Информация передаётся исключительно пользователям в общих списках (только имя) и необходимым поставщикам инфраструктуры (хостинг, аутентификация).
              </SectionText>

              <SectionTitle>10. Безопасность данных</SectionTitle>
              <SectionText>
                Применяются стандартные отраслевые меры безопасности, включая шифрование паролей, защищённое соединение (HTTPS) и строгий контроль доступа.
              </SectionText>

              <SectionTitle>11. Права пользователя</SectionTitle>
              <SectionText>
                Пользователь имеет право на просмотр информации аккаунта, обновление личных данных и безвозвратное удаление аккаунта со всей связанной информацией.
              </SectionText>

              <SectionDivider />

              <SectionTitle>12. Обновления</SectionTitle>
              <SectionText>
                Smart Basket вправе обновлять настоящий документ по мере необходимости. Существенные изменения будут опубликованы в приложении. Продолжение использования после обновления означает согласие с обновлённой редакцией.
              </SectionText>

              <SectionTitle>13. Контакты</SectionTitle>
              <SectionText>
                По всем вопросам, касающимся условий использования или политики конфиденциальности, обращайтесь через раздел «Помощь и поддержка» в настройках приложения.
              </SectionText>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 2 }}>
                Last updated: March 2026
              </Typography>

              <SectionText>
                This document outlines the Terms of Service and Privacy Policy for Smart Basket. By using the application, you agree to the terms set forth below.
              </SectionText>

              {/* Terms of Service */}
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mt: 3, mb: 0.5 }}>
                Terms of Service
              </Typography>

              <SectionTitle>1. Service Description</SectionTitle>
              <SectionText>
                Smart Basket is a platform for managing shopping lists, enabling users to create, edit, and share lists with others. The service is provided free of charge for personal and household use.
              </SectionText>

              <SectionTitle>2. Account & Registration</SectionTitle>
              <SectionText>
                Users are responsible for maintaining the confidentiality of their login credentials and the accuracy of information provided during registration. Any suspected unauthorized access must be reported immediately.
              </SectionText>

              <SectionTitle>3. Acceptable Use</SectionTitle>
              <SectionText>
                The application may only be used for lawful purposes. Disrupting the service, uploading offensive or unlawful content, and attempting unauthorized access to any system are strictly prohibited.
              </SectionText>

              <SectionTitle>4. Intellectual Property</SectionTitle>
              <SectionText>
                All rights to the application, including its design, code, and branding, are reserved by Smart Basket. Content created by users remains their sole property.
              </SectionText>

              <SectionTitle>5. Limitation of Liability</SectionTitle>
              <SectionText>
                The service is provided on an "AS IS" basis without warranties of any kind. Smart Basket shall not be liable for any indirect or consequential damages. The company endeavors to maintain service availability but does not guarantee uninterrupted access.
              </SectionText>

              <SectionTitle>6. Termination</SectionTitle>
              <SectionText>
                Users may delete their account at any time via account settings. Smart Basket reserves the right to suspend accounts that violate these terms.
              </SectionText>

              <SectionDivider />

              {/* Privacy Policy */}
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                Privacy Policy
              </Typography>

              <SectionTitle>7. Information Collection</SectionTitle>
              <SectionText>
                The following information is collected in the course of providing the service:{'\n'}
                • <strong>Account data:</strong> Name, email address, and encrypted password{'\n'}
                • <strong>Content:</strong> Shopping lists, items, and groups{'\n'}
                • <strong>Preferences:</strong> Language, theme, and notification settings{'\n'}
                • <strong>Security data:</strong> Login timestamps and basic technical information
              </SectionText>

              <SectionTitle>8. Use of Information</SectionTitle>
              <SectionText>
                Information is used solely for operating the service, sharing lists with authorized users, delivering relevant notifications, and improving the user experience.
              </SectionText>

              <SectionTitle>9. Third-Party Disclosure</SectionTitle>
              <SectionText>
                <strong>Smart Basket does not sell personal data.</strong> Information is shared only with users in shared lists (name only) and essential infrastructure providers (hosting, authentication).
              </SectionText>

              <SectionTitle>10. Data Security</SectionTitle>
              <SectionText>
                Industry-standard security measures are employed, including password encryption, encrypted communication (HTTPS), and strict access controls.
              </SectionText>

              <SectionTitle>11. User Rights</SectionTitle>
              <SectionText>
                Users have the right to view their account information, update personal details, and permanently delete their account along with all associated data.
              </SectionText>

              <SectionDivider />

              <SectionTitle>12. Updates</SectionTitle>
              <SectionText>
                Smart Basket may update this document from time to time. Material changes will be communicated within the application. Continued use following an update constitutes acceptance of the revised terms.
              </SectionText>

              <SectionTitle>13. Contact</SectionTitle>
              <SectionText>
                For any inquiries regarding these terms or our privacy practices, please reach out via "Help & Support" in the application settings.
              </SectionText>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
});

PrivacyPolicy.displayName = 'PrivacyPolicy';
