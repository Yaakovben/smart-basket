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
                עדכון אחרון: מרץ 2026
              </Typography>

              <SectionText>
                השימוש ב-Smart Basket מהווה הסכמה מלאה לתנאים אלה. אם אינך מסכים, אל תשתמש באפליקציה.
              </SectionText>

              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mt: 3, mb: 0.5 }}>
                תנאי שימוש
              </Typography>

              <SectionTitle>1. השירות</SectionTitle>
              <SectionText>
                Smart Basket היא פלטפורמה לניהול ושיתוף רשימות קניות. השירות מסופק במתכונת "AS IS" ללא כל מצג, התחייבות או אחריות מכל סוג, מפורשת או משתמעת.
              </SectionText>

              <SectionTitle>2. אחריות המשתמש</SectionTitle>
              <SectionText>
                המשתמש אחראי באופן בלעדי לשמירה על פרטי ההתחברות שלו, לדיוק המידע שהוא מזין ולכל פעולה שנעשית דרך חשבונו. השימוש מותר למטרות חוקיות בלבד.
              </SectionText>

              <SectionTitle>3. הגבלת אחריות</SectionTitle>
              <SectionText>
                Smart Basket, מפתחיה, בעליה ונציגיה לא יישאו בכל אחריות לנזק ישיר, עקיף, מקרי, תוצאתי, מיוחד או עונשי, לרבות אובדן נתונים, הפסד רווחים או הפרעה לשימוש, הנובע מהשימוש בשירות או מחוסר היכולת להשתמש בו, גם אם הודיעו על האפשרות לנזק כזה. המשתמש נוטל על עצמו את מלוא הסיכון הכרוך בשימוש.
              </SectionText>

              <SectionTitle>4. שיפוי</SectionTitle>
              <SectionText>
                המשתמש מתחייב לשפות ולפצות את Smart Basket ואת כל הגורמים הקשורים אליה מפני כל תביעה, דרישה, נזק, הוצאה או הפסד הנובעים משימוש המשתמש בשירות או מהפרת תנאים אלה.
              </SectionText>

              <SectionTitle>5. קניין רוחני</SectionTitle>
              <SectionText>
                כל הזכויות באפליקציה שמורות ל-Smart Basket. תוכן שנוצר על ידי המשתמש נשאר בבעלותו.
              </SectionText>

              <SectionTitle>6. סיום</SectionTitle>
              <SectionText>
                Smart Basket רשאית להשעות או לסיים חשבונות בכל עת ולפי שיקול דעתה הבלעדי, ללא הודעה מוקדמת. המשתמש רשאי למחוק את חשבונו בכל עת דרך ההגדרות.
              </SectionText>

              <SectionDivider />

              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                מדיניות פרטיות
              </Typography>

              <SectionTitle>7. מידע שנאסף</SectionTitle>
              <SectionText>
                נאסף מידע הנדרש לתפעול השירות: פרטי חשבון (שם, דוא"ל, סיסמה מוצפנת), תוכן המשתמש (רשימות ופריטים), העדפות ונתוני התחברות בסיסיים.
              </SectionText>

              <SectionTitle>8. שימוש ושיתוף</SectionTitle>
              <SectionText>
                המידע משמש לתפעול השירות בלבד. Smart Basket אינה מוכרת מידע אישי. מידע מועבר רק למשתמשים ברשימות משותפות ולספקי תשתית הכרחיים.
              </SectionText>

              <SectionTitle>9. זכויות ומחיקה</SectionTitle>
              <SectionText>
                המשתמש רשאי לצפות, לעדכן ולמחוק את כל המידע שלו בכל עת דרך הגדרות החשבון. מחיקת החשבון היא בלתי הפיכה.
              </SectionText>

              <SectionDivider />

              <SectionTitle>10. שינויים ודין חל</SectionTitle>
              <SectionText>
                תנאים אלה עשויים להתעדכן. המשך השימוש מהווה הסכמה לנוסח המעודכן. על תנאים אלה יחולו דיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בישראל.
              </SectionText>
            </>
          ) : language === 'ru' ? (
            <>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 2 }}>
                Последнее обновление: март 2026
              </Typography>

              <SectionText>
                Использование Smart Basket означает полное согласие с данными условиями. Если вы не согласны, не используйте приложение.
              </SectionText>

              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mt: 3, mb: 0.5 }}>
                Условия использования
              </Typography>

              <SectionTitle>1. Сервис</SectionTitle>
              <SectionText>
                Smart Basket — платформа для управления и совместного использования списков покупок. Сервис предоставляется «как есть» (AS IS) без каких-либо явных или подразумеваемых гарантий.
              </SectionText>

              <SectionTitle>2. Ответственность пользователя</SectionTitle>
              <SectionText>
                Пользователь несёт исключительную ответственность за сохранность учётных данных, достоверность вводимой информации и все действия, совершённые через его аккаунт. Использование допускается только в законных целях.
              </SectionText>

              <SectionTitle>3. Ограничение ответственности</SectionTitle>
              <SectionText>
                Smart Basket, её разработчики, владельцы и представители не несут ответственности за любой прямой, косвенный, случайный, побочный, особый или штрафной ущерб, включая потерю данных, упущенную выгоду или перебои в работе, возникшие в результате использования или невозможности использования сервиса, даже если было сообщено о возможности такого ущерба. Пользователь принимает на себя весь риск, связанный с использованием.
              </SectionText>

              <SectionTitle>4. Возмещение убытков</SectionTitle>
              <SectionText>
                Пользователь обязуется возместить Smart Basket и всем связанным с ней сторонам любые претензии, требования, убытки, расходы или потери, возникшие в результате использования сервиса или нарушения данных условий.
              </SectionText>

              <SectionTitle>5. Интеллектуальная собственность</SectionTitle>
              <SectionText>
                Все права на приложение принадлежат Smart Basket. Контент, созданный пользователем, остаётся его собственностью.
              </SectionText>

              <SectionTitle>6. Прекращение</SectionTitle>
              <SectionText>
                Smart Basket вправе приостановить или удалить аккаунты в любое время по своему усмотрению без предварительного уведомления. Пользователь может удалить свой аккаунт в настройках.
              </SectionText>

              <SectionDivider />

              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                Политика конфиденциальности
              </Typography>

              <SectionTitle>7. Собираемая информация</SectionTitle>
              <SectionText>
                Собирается информация, необходимая для работы сервиса: данные аккаунта (имя, email, зашифрованный пароль), контент пользователя (списки и товары), настройки и базовые данные входа.
              </SectionText>

              <SectionTitle>8. Использование и передача</SectionTitle>
              <SectionText>
                Информация используется исключительно для работы сервиса. Smart Basket не продаёт персональные данные. Данные передаются только пользователям в общих списках и необходимым поставщикам инфраструктуры.
              </SectionText>

              <SectionTitle>9. Права и удаление</SectionTitle>
              <SectionText>
                Пользователь может просматривать, обновлять и удалять все свои данные в любое время через настройки аккаунта. Удаление аккаунта необратимо.
              </SectionText>

              <SectionDivider />

              <SectionTitle>10. Изменения и применимое право</SectionTitle>
              <SectionText>
                Данные условия могут обновляться. Продолжение использования означает согласие с обновлённой редакцией. Настоящие условия регулируются законодательством Государства Израиль, и исключительная юрисдикция принадлежит компетентным судам Израиля.
              </SectionText>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 2 }}>
                Last updated: March 2026
              </Typography>

              <SectionText>
                By using Smart Basket, you fully agree to these terms. If you do not agree, do not use the application.
              </SectionText>

              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mt: 3, mb: 0.5 }}>
                Terms of Service
              </Typography>

              <SectionTitle>1. The Service</SectionTitle>
              <SectionText>
                Smart Basket is a platform for managing and sharing shopping lists. The service is provided on an "AS IS" basis without any warranties, representations, or guarantees of any kind, express or implied.
              </SectionText>

              <SectionTitle>2. User Responsibility</SectionTitle>
              <SectionText>
                Users are solely responsible for maintaining the security of their login credentials, the accuracy of information they provide, and all activity conducted through their account. Use is permitted for lawful purposes only.
              </SectionText>

              <SectionTitle>3. Limitation of Liability</SectionTitle>
              <SectionText>
                Smart Basket, its developers, owners, and representatives shall not be liable for any direct, indirect, incidental, consequential, special, or punitive damages, including but not limited to data loss, lost profits, or service interruption, arising from the use of or inability to use the service, even if advised of the possibility of such damages. Users assume all risk associated with use.
              </SectionText>

              <SectionTitle>4. Indemnification</SectionTitle>
              <SectionText>
                Users agree to indemnify and hold harmless Smart Basket and all related parties from any claims, demands, damages, expenses, or losses arising from the user's use of the service or breach of these terms.
              </SectionText>

              <SectionTitle>5. Intellectual Property</SectionTitle>
              <SectionText>
                All rights to the application are reserved by Smart Basket. Content created by users remains their property.
              </SectionText>

              <SectionTitle>6. Termination</SectionTitle>
              <SectionText>
                Smart Basket may suspend or terminate accounts at any time at its sole discretion without prior notice. Users may delete their account at any time via settings.
              </SectionText>

              <SectionDivider />

              <Typography sx={{ fontSize: 17, fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                Privacy Policy
              </Typography>

              <SectionTitle>7. Information Collected</SectionTitle>
              <SectionText>
                Information necessary for service operation is collected: account details (name, email, encrypted password), user content (lists and items), preferences, and basic login data.
              </SectionText>

              <SectionTitle>8. Use & Sharing</SectionTitle>
              <SectionText>
                Information is used solely for service operation. Smart Basket does not sell personal data. Data is shared only with users in shared lists and essential infrastructure providers.
              </SectionText>

              <SectionTitle>9. Rights & Deletion</SectionTitle>
              <SectionText>
                Users may view, update, and delete all their data at any time via account settings. Account deletion is irreversible.
              </SectionText>

              <SectionDivider />

              <SectionTitle>10. Changes & Governing Law</SectionTitle>
              <SectionText>
                These terms may be updated. Continued use constitutes acceptance of the revised terms. These terms are governed by the laws of the State of Israel, and exclusive jurisdiction is vested in the competent courts of Israel.
              </SectionText>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
});

PrivacyPolicy.displayName = 'PrivacyPolicy';
