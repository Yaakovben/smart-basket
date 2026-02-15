import { memo } from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary', mb: 1, mt: 3 }}>
    {children}
  </Typography>
);

const SectionText = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ color: 'text.secondary', lineHeight: 1.8, fontSize: 14 }}>
    {children}
  </Typography>
);

export const TermsOfService = memo(() => {
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
            {t('termsOfService')}
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        <Paper sx={{ p: 3, borderRadius: '16px' }}>
          {language === 'he' ? (
            <>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                עודכן לאחרונה: פברואר 2026
              </Typography>

              <SectionText>
                ברוכים הבאים ל-Smart Basket. השימוש באפליקציה מהווה הסכמה לתנאים אלה.
              </SectionText>

              <SectionTitle>1. השירות</SectionTitle>
              <SectionText>
                Smart Basket מאפשרת ניהול רשימות קניות אישיות ושיתופן עם אחרים. השירות מסופק חינם לשימוש אישי ומשפחתי.
              </SectionText>

              <SectionTitle>2. חשבון המשתמש</SectionTitle>
              <SectionText>
                • אתה אחראי לשמירה על סודיות פרטי ההתחברות{'\n'}
                • עליך לספק מידע מדויק בעת ההרשמה{'\n'}
                • הודע לנו מיד על שימוש לא מורשה בחשבונך
              </SectionText>

              <SectionTitle>3. שימוש מותר</SectionTitle>
              <SectionText>
                השתמש באפליקציה למטרות חוקיות בלבד. <strong>אסור:</strong>{'\n'}
                • לפגוע בשירות או במשתמשים אחרים{'\n'}
                • להעלות תוכן פוגעני, בלתי חוקי או מזיק{'\n'}
                • לנסות לגשת למערכות ללא הרשאה
              </SectionText>

              <SectionTitle>4. קניין רוחני</SectionTitle>
              <SectionText>
                האפליקציה, כולל העיצוב והקוד, שייכים ל-Smart Basket. התוכן שאתה יוצר (רשימות, מוצרים) נשאר שלך.
              </SectionText>

              <SectionTitle>5. הגבלת אחריות</SectionTitle>
              <SectionText>
                השירות מסופק "כמו שהוא" (AS IS). אנו לא אחראים לנזקים עקיפים או תוצאתיים הנובעים מהשימוש בשירות. אנו עושים מאמצים לשמור על זמינות השירות אך לא מתחייבים לזמינות רציפה.
              </SectionText>

              <SectionTitle>6. סיום השימוש</SectionTitle>
              <SectionText>
                • תוכל למחוק את חשבונך בכל עת דרך ההגדרות{'\n'}
                • אנו רשאים להשעות חשבונות המפרים תנאים אלה
              </SectionText>

              <SectionTitle>7. שינויים בתנאים</SectionTitle>
              <SectionText>
                נעדכן תנאים אלה לפי הצורך. המשך השימוש לאחר עדכון מהווה הסכמה לתנאים החדשים.
              </SectionText>

              <SectionTitle>8. יצירת קשר</SectionTitle>
              <SectionText>
                לשאלות, פנה אלינו דרך "עזרה ותמיכה" בהגדרות.
              </SectionText>
            </>
          ) : language === 'ru' ? (
            <>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                Последнее обновление: февраль 2026
              </Typography>

              <SectionText>
                Добро пожаловать в Smart Basket. Используя приложение, вы соглашаетесь с этими условиями.
              </SectionText>

              <SectionTitle>1. Сервис</SectionTitle>
              <SectionText>
                Smart Basket позволяет управлять личными списками покупок и делиться ими с другими. Сервис предоставляется бесплатно для личного и семейного использования.
              </SectionText>

              <SectionTitle>2. Аккаунт пользователя</SectionTitle>
              <SectionText>
                • Вы несёте ответственность за сохранение конфиденциальности данных для входа{'\n'}
                • Вы должны предоставить точную информацию при регистрации{'\n'}
                • Немедленно сообщите нам о несанкционированном использовании вашего аккаунта
              </SectionText>

              <SectionTitle>3. Допустимое использование</SectionTitle>
              <SectionText>
                Используйте приложение только в законных целях. <strong>Запрещено:</strong>{'\n'}
                • Наносить вред сервису или другим пользователям{'\n'}
                • Загружать оскорбительный, незаконный или вредоносный контент{'\n'}
                • Пытаться получить несанкционированный доступ к системам
              </SectionText>

              <SectionTitle>4. Интеллектуальная собственность</SectionTitle>
              <SectionText>
                Приложение, включая дизайн и код, принадлежит Smart Basket. Контент, который вы создаёте (списки, товары), остаётся вашим.
              </SectionText>

              <SectionTitle>5. Ограничение ответственности</SectionTitle>
              <SectionText>
                Сервис предоставляется «как есть» (AS IS). Мы не несём ответственности за косвенные или побочные убытки, возникающие в результате использования сервиса. Мы стремимся поддерживать доступность сервиса, но не гарантируем непрерывный доступ.
              </SectionText>

              <SectionTitle>6. Прекращение использования</SectionTitle>
              <SectionText>
                • Вы можете удалить свой аккаунт в любое время через настройки{'\n'}
                • Мы можем заблокировать аккаунты, нарушающие эти условия
              </SectionText>

              <SectionTitle>7. Изменения условий</SectionTitle>
              <SectionText>
                Мы можем обновлять эти условия по мере необходимости. Продолжение использования после обновления означает согласие с новыми условиями.
              </SectionText>

              <SectionTitle>8. Контакты</SectionTitle>
              <SectionText>
                По вопросам свяжитесь с нами через «Помощь и поддержка» в настройках.
              </SectionText>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
                Last updated: February 2026
              </Typography>

              <SectionText>
                Welcome to Smart Basket. By using the app, you agree to these terms.
              </SectionText>

              <SectionTitle>1. The Service</SectionTitle>
              <SectionText>
                Smart Basket enables personal shopping list management and sharing with others. The service is provided free for personal and family use.
              </SectionText>

              <SectionTitle>2. User Account</SectionTitle>
              <SectionText>
                • You are responsible for maintaining the confidentiality of your login credentials{'\n'}
                • You must provide accurate information during registration{'\n'}
                • Notify us immediately of any unauthorized use of your account
              </SectionText>

              <SectionTitle>3. Acceptable Use</SectionTitle>
              <SectionText>
                Use the app for lawful purposes only. <strong>Do not:</strong>{'\n'}
                • Harm the service or other users{'\n'}
                • Upload offensive, illegal, or harmful content{'\n'}
                • Attempt to access systems without authorization
              </SectionText>

              <SectionTitle>4. Intellectual Property</SectionTitle>
              <SectionText>
                The app, including its design and code, belongs to Smart Basket. Content you create (lists, products) remains yours.
              </SectionText>

              <SectionTitle>5. Limitation of Liability</SectionTitle>
              <SectionText>
                The service is provided "AS IS". We are not liable for indirect or consequential damages arising from use of the service. We strive to maintain service availability but do not guarantee uninterrupted access.
              </SectionText>

              <SectionTitle>6. Termination</SectionTitle>
              <SectionText>
                • You may delete your account at any time via settings{'\n'}
                • We may suspend accounts that violate these terms
              </SectionText>

              <SectionTitle>7. Changes to Terms</SectionTitle>
              <SectionText>
                We may update these terms as needed. Continued use after an update constitutes acceptance of the new terms.
              </SectionText>

              <SectionTitle>8. Contact</SectionTitle>
              <SectionText>
                For questions, contact us via "Help & Support" in settings.
              </SectionText>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
});

TermsOfService.displayName = 'TermsOfService';
