import type { Language } from '../types';

type TranslationKey =
  // General
  | 'appName'
  | 'version'
  | 'save'
  | 'cancel'
  | 'delete'
  | 'edit'
  | 'close'
  | 'back'
  | 'confirm'
  | 'yes'
  | 'no'
  // Settings
  | 'settings'
  | 'notifications'
  | 'darkMode'
  | 'language'
  | 'helpSupport'
  | 'about'
  | 'deleteAllData'
  | 'notificationSettings'
  | 'enableNotifications'
  | 'groupNotifications'
  | 'memberJoined'
  | 'memberLeft'
  | 'memberRemoved'
  | 'memberJoinedNotif'
  | 'memberLeftNotif'
  | 'memberRemovedNotif'
  | 'groupDeletedNotifSetting'
  | 'listUpdatedNotifSetting'
  | 'enableAll'
  | 'disableAll'
  | 'productNotifications'
  | 'productAdded'
  | 'productDeleted'
  | 'productEdited'
  | 'productPurchased'
  | 'muteGroup'
  | 'unmuteGroup'
  | 'groupMuted'
  | 'notificationsOff'
  // Help & Support
  | 'contactUs'
  | 'sendEmail'
  | 'sendWhatsApp'
  | 'helpDescription'
  // About
  | 'aboutDescription'
  | 'developedBy'
  | 'allRightsReserved'
  // Home
  | 'hello'
  | 'search'
  | 'all'
  | 'myLists'
  | 'groups'
  | 'createList'
  | 'createGroup'
  | 'newGroup'
  | 'joinGroup'
  | 'privateList'
  | 'privateListDesc'
  | 'sharedGroup'
  | 'sharedGroupDesc'
  | 'joinExistingGroup'
  | 'joinExistingGroupDesc'
  | 'noLists'
  | 'noListsDesc'
  | 'noGroups'
  | 'noGroupsDesc'
  | 'createFirstList'
  | 'createFirstGroup'
  | 'items'
  | 'listsCount'
  | 'completed'
  | 'group'
  | 'private'
  // List
  | 'toBuy'
  | 'purchased'
  | 'addProduct'
  | 'newProduct'
  | 'productName'
  | 'quantity'
  | 'unit'
  | 'category'
  | 'add'
  | 'editProduct'
  | 'deleteProduct'
  | 'productDetails'
  | 'addedBy'
  | 'date'
  | 'time'
  | 'you'
  | 'shareList'
  | 'inviteFriends'
  | 'shareDetails'
  | 'groupCode'
  | 'password'
  | 'copy'
  | 'copied'
  | 'members'
  | 'admin'
  | 'online'
  | 'removeMember'
  | 'leaveGroup'
  | 'deleteGroup'
  | 'deleteList'
  | 'listName'
  | 'groupName'
  | 'icon'
  | 'color'
  | 'saveChanges'
  | 'editList'
  | 'editGroup'
  | 'groupSettings'
  | 'allDone'
  | 'allDoneDesc'
  | 'noProducts'
  | 'noProductsDesc'
  | 'noSearchResults'
  | 'noSearchResultsDesc'
  | 'noPurchasedProducts'
  | 'noPurchasedProductsDesc'
  | 'swipeHint'
  // Profile
  | 'profile'
  | 'editProfile'
  | 'name'
  | 'email'
  | 'logout'
  | 'logoutConfirm'
  // Auth
  | 'login'
  | 'register'
  | 'welcomeBack'
  | 'createAccount'
  // Units
  | 'unitPiece'
  | 'unitKg'
  | 'unitGram'
  | 'unitLiter'
  // Categories
  | 'catDairy'
  | 'catBakery'
  | 'catVegetables'
  | 'catFruits'
  | 'catMeat'
  | 'catBeverages'
  | 'catSweets'
  | 'catCleaning'
  | 'catOther'
  // Toasts
  | 'added'
  | 'adding'
  | 'saved'
  | 'deleted'
  | 'updated'
  | 'removed'
  | 'copyError'
  // Errors
  | 'enterListName'
  | 'nameTooShort'
  | 'enterProductName'
  | 'productNameTooShort'
  | 'quantityMin'
  | 'enterCodeAndPassword'
  | 'enterCodeAndPasswordHint'
  | 'groupNotFound'
  | 'wrongPassword'
  | 'useGoogleSignIn'
  | 'alreadyInGroup'
  | 'userNotLoggedIn'
  | 'unknownError'
  | 'tooManyAttempts'
  | 'invalidGroupCode'
  | 'invalidGroupPassword'
  | 'alreadyMember'
  | 'youAreOwner'
  | 'or'
  | 'enterEmail'
  | 'invalidEmail'
  | 'enterPassword'
  | 'enterName'
  | 'passwordTooShort'
  | 'confirmPassword'
  | 'passwordMismatch'
  | 'emailExists'
  | 'didYouMean'
  | 'removeMemberConfirm'
  | 'leaveGroupConfirm'
  | 'makeAdmin'
  | 'removeAdmin'
  | 'makeAllAdmins'
  | 'whatToCreate'
  | 'loginWithoutGoogle'
  | 'hideEmailLogin'
  | 'return'
  | 'profileUpdated'
  | 'created'
  | 'joinedGroup'
  | 'left'
  // Socket notifications
  | 'addedProductNotif'
  | 'editedProductNotif'
  | 'deletedProductNotif'
  | 'purchasedNotif'
  | 'unmarkedPurchasedNotif'
  | 'joinedGroupNotif'
  | 'leftGroupNotif'
  | 'removedFromGroupNotif'
  | 'removedYouNotif'
  | 'deletedGroupNotif'
  | 'listUpdatedNotif'
  | 'groupDeletedNotif'
  | 'inListNotif'
  | 'deleteGroupTitle'
  | 'deleteListTitle'
  | 'deleteConfirmMessage'
  | 'deleteDataWarning'
  | 'errorOccurred'
  | 'noNotifications'
  | 'home'
  | 'new'
  | 'markAllAsRead'
  // Legal
  | 'privacyPolicy'
  | 'termsOfService'
  | 'consentTitle'
  | 'consentDescription'
  | 'accept'
  | 'legal'
  // Admin Dashboard
  | 'adminDashboard'
  | 'loginActivity'
  | 'totalUsers'
  | 'loginsToday'
  | 'loginsThisMonth'
  | 'onlineNow'
  | 'allActivity'
  | 'dailyView'
  | 'monthlyView'
  | 'hourlyView'
  | 'noActivityFound'
  | 'loginMethod'
  | 'viaEmail'
  | 'viaGoogle'
  | 'selectMonth'
  | 'selectDate'
  | 'selectHour'
  | 'uniqueUsersToday'
  | 'uniqueUsersThisMonth'
  | 'registeredUsers'
  | 'lastLogin'
  | 'neverLoggedIn'
  | 'refreshData'
  | 'searchCustomer'
  // Error Boundary
  | 'errorTitle'
  | 'errorDescription'
  | 'tryAgain'
  | 'refreshPage'
  | 'showErrorDetails'
  | 'hideErrorDetails'
  | 'copyErrorDetails'
  | 'copiedToClipboard'
  | 'copyAndSendToSupport'
  | 'clearCacheAndReload'
  | 'updatingVersion'
  // Auth
  | 'continueWithGoogle'
  | 'newUserHint'
  | 'returningUserHint'
  | 'continue'
  | 'change'
  | 'networkError'
  | 'googleLoginError'
  | 'passwordWeak'
  | 'passwordMedium'
  | 'passwordStrong'
  | 'localStorageError'
  | 'cacheError'
  | 'noUserData'
  | 'offlineMessage'
  // Clear Cache Page
  | 'clearCacheTitle'
  | 'clearCacheSubtitle'
  | 'clearCacheDone'
  | 'clearCacheRedirect'
  | 'clearCacheStepSW'
  | 'clearCacheStepCaches'
  | 'clearCacheStepStorage'
  | 'clearCacheStepSession'
  | 'clearCacheStepCookies'
  // Share
  | 'shareListDescription'
  // Quick Add
  | 'quickAddPlaceholder'
  | 'searchProducts'
  // What's New
  | 'whatsNewTitle'
  | 'letsStart'
  // Time formatting
  | 'timeNow'
  | 'timeMinutesAgo'
  | 'timeHoursAgo'
  | 'timeYesterday'
  | 'timeDaysAgo'
  | 'timeWeeksAgo'
  | 'timeMonthsAgo'
  // Push notification prompt
  | 'pushNotifBlocked'
  | 'pushNotifBlockedDesc'
  | 'pushNotifBenefits'
  | 'gotIt'
  | 'notNow'
  // Join group hints
  | 'sixChars'
  | 'fourDigits'
  // Push settings
  | 'pushNotifications'
  | 'pushActive'
  | 'pushDescription'
  | 'pushNotSupported'
  | 'pushBlocked'
  | 'pushErrorNotConfigured'
  | 'pushErrorSaveFailed'
  | 'pushErrorSubscribeFailed'
  | 'pushErrorUnknown'
  | 'pushRequiresInstall'
  | 'pushInstallAndroid'
  | 'pushInstallIOS'
  | 'pushInstallDesktop'
  // Notification counts
  | 'newNotification'
  | 'newNotifications'
  // Empty notification state
  | 'noNotificationsYet'
  // Clear cache
  | 'clearCacheRefresh'
  // Admin inline
  | 'today'
  | 'yesterday'
  | 'logins'
  | 'loginMethodLabel'
  | 'adminLoadError'
  // WhatsApp share
  | 'listCompleted'
  | 'sessionExpired'
  // Convert list to group
  | 'convertToGroup'
  | 'convertToGroupHint'
  | 'setGroupPassword'
  // Duplicate product
  | 'productExists'
  | 'productExistsMessage'
  | 'increaseQuantity'
  | 'addAnyway'
  // Refresh
  | 'refresh';

type Translations = Record<TranslationKey, string>;

export const translations: Record<Language, Translations> = {
  he: {
    // General
    appName: 'SmartBasket',
    version: 'גרסה',
    save: 'שמור',
    cancel: 'ביטול',
    delete: 'מחק',
    edit: 'עריכה',
    close: 'סגור',
    back: 'חזור',
    confirm: 'אישור',
    yes: 'כן',
    no: 'לא',
    // Settings
    settings: 'הגדרות',
    notifications: 'התראות',
    darkMode: 'מצב כהה',
    language: 'שפה',
    helpSupport: 'עזרה ותמיכה',
    about: 'אודות',
    deleteAllData: 'מחק את כל הנתונים',
    notificationSettings: 'הגדרות התראות',
    enableNotifications: 'הפעל התראות',
    groupNotifications: 'התראות רשימות',
    memberJoined: 'הצטרף/ה לרשימה',
    memberLeft: 'עזב/ה את הרשימה',
    memberRemoved: 'הוסר/ה מהרשימה',
    memberJoinedNotif: 'חבר הצטרף לרשימה',
    memberLeftNotif: 'חבר עזב את הרשימה',
    memberRemovedNotif: 'הסרת חבר מרשימה',
    groupDeletedNotifSetting: 'מחיקת רשימה',
    listUpdatedNotifSetting: 'שינוי הגדרות רשימה',
    enableAll: 'הפעל הכל',
    disableAll: 'כבה הכל',
    productNotifications: 'התראות מוצרים',
    productAdded: 'מוצר נוסף',
    productDeleted: 'מוצר נמחק',
    productEdited: 'מוצר נערך',
    productPurchased: 'מוצר נקנה',
    muteGroup: 'השתק רשימה',
    unmuteGroup: 'בטל השתקה',
    groupMuted: 'הרשימה מושתקת',
    notificationsOff: 'ההתראות כבויות בהגדרות הראשיות',
    // Help & Support
    contactUs: 'צור קשר',
    sendEmail: 'שלח אימייל',
    sendWhatsApp: 'שלח וואטסאפ',
    helpDescription: 'נשמח לעזור! פנה אלינו בכל שאלה.',
    // About
    aboutDescription: 'פשוט, נוח, משותף - רשימת קניות חכמה',
    developedBy: 'פותח על ידי',
    allRightsReserved: 'כל הזכויות שמורות',
    // Home
    hello: 'שלום,',
    search: 'חיפוש רשימה...',
    all: 'הכל',
    myLists: 'שלי',
    groups: 'משותפות',
    createList: 'צור רשימה',
    createGroup: 'צור רשימה משותפת',
    newGroup: 'רשימה משותפת חדשה',
    joinGroup: 'הצטרף לרשימה',
    privateList: 'רשימה פרטית',
    privateListDesc: 'צור רשימת קניות אישית רק בשבילך',
    sharedGroup: 'רשימה משותפת',
    sharedGroupDesc: 'צור רשימה ושתף עם משפחה וחברים',
    joinExistingGroup: 'הצטרף לרשימה קיימת',
    joinExistingGroupDesc: 'יש לך קוד הזמנה? הכנס אותו כאן',
    noLists: 'טרם נוצרו רשימות',
    noListsDesc: 'התחל ביצירת רשימת קניות חדשה ועקוב בקלות אחר הצרכים שלך',
    noGroups: 'טרם נוצרו רשימות משותפות',
    noGroupsDesc: 'התחל ברשימה משותפת וצור רשימות קניות עם המשפחה והחברים',
    createFirstList: 'צור רשימה ראשונה',
    createFirstGroup: 'צור רשימה משותפת',
    items: 'פריטים',
    listsCount: 'רשימות',
    completed: 'הושלם',
    group: 'משותפת',
    private: 'פרטית',
    // List
    toBuy: 'לקנות',
    purchased: 'נקנה',
    addProduct: 'הוסף מוצר',
    newProduct: 'מוצר חדש',
    productName: 'שם המוצר',
    quantity: 'כמות',
    unit: 'יחידה',
    category: 'קטגוריה',
    add: 'הוסף',
    editProduct: 'ערוך מוצר',
    deleteProduct: 'מחק מוצר',
    productDetails: 'פרטי מוצר',
    addedBy: 'נוסף ע״י',
    date: 'תאריך',
    time: 'שעה',
    you: 'את/ה',
    shareList: 'שתף רשימה',
    inviteFriends: 'הזמן חברים',
    shareDetails: 'שתף את הפרטים להצטרפות לרשימה',
    groupCode: 'קוד רשימה',
    password: 'סיסמה',
    copy: 'העתק',
    copied: 'הועתק!',
    members: 'חברים',
    admin: 'מנהל',
    online: 'מחובר',
    removeMember: 'הסר חבר',
    leaveGroup: 'עזוב רשימה',
    deleteGroup: 'מחק רשימה',
    deleteList: 'מחק רשימה',
    listName: 'שם הרשימה',
    groupName: 'שם הרשימה',
    icon: 'אייקון',
    color: 'צבע',
    saveChanges: 'שמור שינויים',
    editList: 'עריכת רשימה',
    editGroup: 'עריכת רשימה',
    groupSettings: 'הגדרות רשימה',
    allDone: 'כל הכבוד!',
    allDoneDesc: 'כל המוצרים נקנו בהצלחה',
    noProducts: 'אין מוצרים',
    noProductsDesc: 'הוסף מוצרים חדשים לרשימה',
    noSearchResults: 'לא נמצאו תוצאות',
    noSearchResultsDesc: 'נסה לחפש מילה אחרת',
    noPurchasedProducts: 'אין מוצרים שנקנו',
    noPurchasedProductsDesc: 'מוצרים שתסמן כנקנו יופיעו כאן',
    swipeHint: 'טיפ: גרור שמאלה לפעולות • לחץ לפרטים',
    // Profile
    profile: 'פרופיל',
    editProfile: 'עריכת פרופיל',
    name: 'שם',
    email: 'אימייל',
    logout: 'התנתק',
    logoutConfirm: 'להתנתק מהחשבון?',
    // Auth
    login: 'התחבר',
    register: 'הירשם',
    welcomeBack: 'ברוך שובך!',
    createAccount: 'צור חשבון',
    // Units
    unitPiece: 'יח׳',
    unitKg: 'ק״ג',
    unitGram: 'גרם',
    unitLiter: 'ליטר',
    // Categories
    catDairy: 'מוצרי חלב',
    catBakery: 'מאפים',
    catVegetables: 'ירקות',
    catFruits: 'פירות',
    catMeat: 'בשר',
    catBeverages: 'משקאות',
    catSweets: 'ממתקים',
    catCleaning: 'ניקיון',
    catOther: 'אחר',
    // Toasts
    added: 'נוסף',
    adding: 'מוסיף...',
    saved: 'נשמר',
    deleted: 'נמחק',
    updated: 'עודכן',
    removed: 'הוסר',
    copyError: 'שגיאה בהעתקה',
    // Errors
    enterListName: 'נא להזין שם לרשימה',
    nameTooShort: 'השם חייב להכיל לפחות 2 תווים',
    enterProductName: 'נא להזין שם מוצר',
    productNameTooShort: 'שם המוצר חייב להכיל לפחות 2 תווים',
    quantityMin: 'כמות חייבת להיות לפחות 1',
    enterCodeAndPassword: 'נא למלא קוד וסיסמה',
    enterCodeAndPasswordHint: 'הזן את הקוד והסיסמה שקיבלת',
    groupNotFound: 'רשימה לא נמצאה',
    wrongPassword: 'סיסמה שגויה',
    useGoogleSignIn: 'חשבון זה נוצר עם Google. יש להתחבר עם Google.',
    alreadyInGroup: 'אתה כבר ברשימה',
    userNotLoggedIn: 'משתמש לא מחובר',
    unknownError: 'שגיאה לא ידועה',
    tooManyAttempts: 'יותר מדי ניסיונות, נסה שוב מאוחר יותר',
    invalidGroupCode: 'קוד רשימה לא תקין',
    invalidGroupPassword: 'סיסמת רשימה שגויה',
    alreadyMember: 'אתה כבר חבר ברשימה זו',
    youAreOwner: 'אתה הבעלים של רשימה זו',
    or: 'או',
    enterEmail: 'נא להזין אימייל',
    invalidEmail: 'אימייל לא תקין',
    enterPassword: 'נא להזין סיסמה',
    enterName: 'נא להזין שם',
    passwordTooShort: 'סיסמה חייבת להכיל לפחות 8 תווים',
    confirmPassword: 'נא לאמת סיסמה',
    passwordMismatch: 'הסיסמאות אינן תואמות',
    emailExists: 'אימייל זה כבר קיים',
    didYouMean: 'האם התכוונת ל',
    removeMemberConfirm: 'האם להסיר את {name} מהרשימה?',
    leaveGroupConfirm: 'האם לעזוב את הרשימה?',
    makeAdmin: 'הפוך למנהל',
    removeAdmin: 'הסר מנהל',
    makeAllAdmins: 'הפוך את כולם למנהלים',
    whatToCreate: 'מה תרצה ליצור?',
    loginWithoutGoogle: 'התחברות ללא Google',
    hideEmailLogin: 'הסתר',
    return: 'החזר',
    profileUpdated: 'הפרופיל עודכן',
    created: 'נוצר',
    joinedGroup: 'הצטרפת לרשימה',
    left: 'עזבת',
    // Socket notifications
    addedProductNotif: 'הוסיף/ה',
    editedProductNotif: 'ערך/ה',
    deletedProductNotif: 'מחק/ה',
    purchasedNotif: 'סימן/ה כנקנה',
    unmarkedPurchasedNotif: 'ביטל/ה סימון',
    joinedGroupNotif: 'הצטרף/ה לרשימה',
    leftGroupNotif: 'עזב/ה את הרשימה',
    removedFromGroupNotif: 'הוסרת מהרשימה',
    removedYouNotif: 'הסיר/ה אותך מהרשימה',
    deletedGroupNotif: 'מחק/ה את הרשימה',
    listUpdatedNotif: 'עדכן/ה את הגדרות הרשימה',
    groupDeletedNotif: 'הרשימה נמחקה',
    inListNotif: 'ברשימה',
    deleteGroupTitle: 'מחיקת רשימה',
    deleteListTitle: 'מחיקת רשימה',
    deleteConfirmMessage: 'פעולה זו לא ניתנת לביטול',
    deleteDataWarning: 'פעולה זו תמחק:\n• כל הרשימות הפרטיות שלך\n• רשימות משותפות שיצרת יועברו לחבר אחר\n• תוסר מרשימות שהצטרפת אליהן\n• כל ההגדרות וההעדפות\n• חשבונך לצמיתות\n\nפעולה זו לא ניתנת לביטול!',
    errorOccurred: 'אירעה שגיאה',
    noNotifications: 'אין התראות חדשות',
    home: 'בית',
    new: 'חדש',
    markAllAsRead: 'סמן הכל כנקרא',
    // Legal
    privacyPolicy: 'מדיניות פרטיות',
    termsOfService: 'תנאי שימוש',
    consentTitle: 'הסכמה לשימוש בנתונים',
    consentDescription: 'אנו משתמשים באחסון מקומי (LocalStorage) כדי לשמור את ההעדפות שלך ואת נתוני האפליקציה במכשיר שלך. המידע נשאר במכשירך ואינו נשלח לשרתים חיצוניים.',
    accept: 'מסכים',
    legal: 'משפטי',
    // Admin Dashboard
    adminDashboard: 'לוח בקרה למנהל',
    loginActivity: 'פעילות התחברות',
    totalUsers: 'סה״כ משתמשים',
    loginsToday: 'התחברויות היום',
    loginsThisMonth: 'התחברויות החודש',
    onlineNow: 'מחוברים עכשיו',
    allActivity: 'כל הפעילות',
    dailyView: 'יומי',
    monthlyView: 'חודשי',
    hourlyView: 'שעתי',
    noActivityFound: 'לא נמצאה פעילות',
    loginMethod: 'שיטת התחברות',
    viaEmail: 'באמצעות אימייל',
    viaGoogle: 'באמצעות Google',
    selectMonth: 'בחר חודש',
    selectDate: 'בחר תאריך',
    selectHour: 'בחר שעה',
    uniqueUsersToday: 'משתמשים פעילים היום',
    uniqueUsersThisMonth: 'משתמשים פעילים החודש',
    registeredUsers: 'משתמשים רשומים',
    lastLogin: 'התחברות אחרונה',
    neverLoggedIn: 'מעולם לא התחבר',
    refreshData: 'רענן נתונים',
    searchCustomer: 'חיפוש לקוח...',
    // Error Boundary
    errorTitle: 'משהו השתבש',
    errorDescription: 'אירעה שגיאה בלתי צפויה. נסה לרענן את הדף או לחזור אחורה.',
    tryAgain: 'נסה שוב',
    refreshPage: 'רענן דף',
    showErrorDetails: 'הצג פרטי שגיאה',
    hideErrorDetails: 'הסתר פרטי שגיאה',
    copyErrorDetails: 'העתק פרטי שגיאה',
    copiedToClipboard: 'הועתק!',
    copyAndSendToSupport: 'העתק ושלח את פרטי השגיאה לתמיכה',
    clearCacheAndReload: 'נקה מטמון ורענן',
    updatingVersion: 'מעדכן גרסה...',
    // Auth
    continueWithGoogle: 'המשך עם Google',
    newUserHint: 'משתמש חדש? הזן שם וסיסמה להרשמה',
    returningUserHint: 'שלום שוב! הזן סיסמה להתחברות',
    continue: 'המשך',
    change: 'שנה',
    networkError: 'בדוק את חיבור האינטרנט',
    passwordWeak: 'חלשה',
    passwordMedium: 'בינונית',
    passwordStrong: 'חזקה',
    googleLoginError: 'שגיאה בהתחברות עם Google',
    localStorageError: 'לא ניתן לשמור את פרטי ההתחברות. בדוק שהדפדפן מאפשר שמירת נתונים.',
    cacheError: 'יש בעיית חיבור. נסה לנקות מטמון:',
    noUserData: 'שגיאה: לא התקבל מידע משתמש מהשרת',
    offlineMessage: 'אין חיבור לאינטרנט',
    // Clear Cache Page
    clearCacheTitle: 'ניקוי מטמון',
    clearCacheSubtitle: 'מנקה נתונים שמורים...',
    clearCacheDone: 'הניקוי הושלם!',
    clearCacheRedirect: 'מעביר לדף הבית בעוד',
    clearCacheStepSW: 'ביטול רישום Service Workers',
    clearCacheStepCaches: 'ניקוי מטמון דפדפן',
    clearCacheStepStorage: 'ניקוי אחסון מקומי',
    clearCacheStepSession: 'ניקוי אחסון סשן',
    clearCacheStepCookies: 'ניקוי עוגיות',
    // Share
    shareListDescription: 'שתף את רשימת הקניות שלך',
    // Quick Add
    quickAddPlaceholder: 'הוספת מוצר מהירה...',
    searchProducts: 'חיפוש מוצרים...',
    // What's New
    whatsNewTitle: 'מה חדש?',
    letsStart: 'מעולה, בואו נתחיל!',
    // Time formatting
    timeNow: 'עכשיו',
    timeMinutesAgo: 'לפני {count} דק׳',
    timeHoursAgo: 'היום {time}',
    timeYesterday: 'אתמול',
    timeDaysAgo: 'לפני {count} ימים',
    timeWeeksAgo: 'לפני {count}',
    timeMonthsAgo: 'לפני {count}',
    // Push notification prompt
    pushNotifBlocked: 'ההתראות נחסמו',
    pushNotifBlockedDesc: 'כדי להפעיל התראות, יש לאפשר אותן\nבהגדרות הדפדפן → הרשאות → התראות',
    pushNotifBenefits: 'קבל התראות על שינויים ברשימות שלך גם כשהאפליקציה סגורה',
    gotIt: 'הבנתי',
    notNow: 'לא עכשיו',
    // Join group hints
    sixChars: '6 תווים',
    fourDigits: '4 ספרות',
    // Push settings
    pushNotifications: 'התראות Push',
    pushActive: 'פעיל',
    pushDescription: 'קבל התראות גם כשהאפליקציה סגורה',
    pushNotSupported: '* לא נתמך בדפדפן זה.\nבאייפון: לחץ על ״שתף״ ← ״הוסף למסך הבית״ ופתח משם',
    pushBlocked: '⚠️ ההתראות נחסמו.\nהגדרות הדפדפן → הרשאות → התראות → אפשר',
    pushErrorNotConfigured: '* התראות Push לא מוגדרות בשרת',
    pushErrorSaveFailed: '* שמירת ההרשמה נכשלה',
    pushErrorSubscribeFailed: '* ההרשמה לשירות ההתראות נכשלה. נסה להתנתק, למחוק את האפליקציה, להתקין מחדש ולהתחבר שוב',
    pushErrorUnknown: '* שגיאה לא ידועה',
    pushRequiresInstall: 'כדי לקבל התראות Push, יש להתקין את האפליקציה למסך הבית',
    pushInstallAndroid: 'בתפריט הדפדפן (⋮) → "התקן אפליקציה" או "הוסף למסך הבית"',
    pushInstallIOS: 'לחץ על כפתור השיתוף (⎋) → "הוסף למסך הבית"',
    pushInstallDesktop: 'לחץ על סמל ההתקנה (⊕) בשורת הכתובת של הדפדפן',
    // Notification counts
    newNotification: 'התראה חדשה',
    newNotifications: 'התראות חדשות',
    // Empty notification state
    noNotificationsYet: 'כשיהיו עדכונים חדשים ברשימות שלך,\nהם יופיעו כאן',
    // Clear cache
    clearCacheRefresh: 'נקה מטמון ועדכן',
    // Admin inline
    today: 'היום',
    yesterday: 'אתמול',
    logins: 'כניסות',
    loginMethodLabel: 'שיטת התחברות:',
    adminLoadError: 'שגיאה בטעינת נתוני הניהול',
    // WhatsApp share
    listCompleted: 'הרשימה הושלמה',
    sessionExpired: 'החיבור פג תוקף, יש להתחבר מחדש',
    convertToGroup: 'הפוך לרשימה משותפת',
    convertToGroupHint: 'שתף את הרשימה עם אחרים',
    setGroupPassword: 'הגדר סיסמת קבוצה (4 ספרות)',
    productExists: 'מוצר קיים',
    productExistsMessage: '"{name}" כבר ברשימה ({quantity} {unit}). מה לעשות?',
    increaseQuantity: 'הגדל כמות',
    addAnyway: 'הוסף בכל זאת',
    refresh: 'רענון',
  },
  en: {
    // General
    appName: 'SmartBasket',
    version: 'Version',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    // Settings
    settings: 'Settings',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    language: 'Language',
    helpSupport: 'Help & Support',
    about: 'About',
    deleteAllData: 'Delete All Data',
    notificationSettings: 'Notification Settings',
    enableNotifications: 'Enable Notifications',
    groupNotifications: 'List Notifications',
    memberJoined: 'Joined the list',
    memberLeft: 'Left the list',
    memberRemoved: 'Was removed from list',
    memberJoinedNotif: 'Member joined the list',
    memberLeftNotif: 'Member left the list',
    memberRemovedNotif: 'Member removed from list',
    groupDeletedNotifSetting: 'List deleted',
    listUpdatedNotifSetting: 'List settings changed',
    enableAll: 'Enable all',
    disableAll: 'Disable all',
    productNotifications: 'Product Notifications',
    productAdded: 'Product Added',
    productDeleted: 'Product Deleted',
    productEdited: 'Product Edited',
    productPurchased: 'Product Purchased',
    muteGroup: 'Mute List',
    unmuteGroup: 'Unmute List',
    groupMuted: 'List Muted',
    notificationsOff: 'Notifications are off in main settings',
    // Help & Support
    contactUs: 'Contact Us',
    sendEmail: 'Send Email',
    sendWhatsApp: 'Send WhatsApp',
    helpDescription: 'We\'d love to help! Contact us with any questions.',
    // About
    aboutDescription: 'Simple, convenient, shared - a smart shopping list',
    developedBy: 'Developed by',
    allRightsReserved: 'All rights reserved',
    // Home
    hello: 'Hello,',
    search: 'Search...',
    all: 'All',
    myLists: 'My Lists',
    groups: 'Shared',
    createList: 'Create List',
    createGroup: 'Create Shared List',
    newGroup: 'New Shared List',
    joinGroup: 'Join List',
    privateList: 'Private List',
    privateListDesc: 'Create a personal shopping list just for you',
    sharedGroup: 'Shared List',
    sharedGroupDesc: 'Create a list and share with family and friends',
    joinExistingGroup: 'Join Existing List',
    joinExistingGroupDesc: 'Have an invite code? Enter it here',
    noLists: 'No lists yet',
    noListsDesc: 'Start by creating a new shopping list and easily track your needs',
    noGroups: 'No shared lists yet',
    noGroupsDesc: 'Start with a shared list and create shopping lists with family and friends',
    createFirstList: 'Create First List',
    createFirstGroup: 'Create Shared List',
    items: 'items',
    listsCount: 'lists',
    completed: 'Completed',
    group: 'Shared',
    private: 'Private',
    // List
    toBuy: 'To Buy',
    purchased: 'Purchased',
    addProduct: 'Add Product',
    newProduct: 'New Product',
    productName: 'Product Name',
    quantity: 'Quantity',
    unit: 'Unit',
    category: 'Category',
    add: 'Add',
    editProduct: 'Edit Product',
    deleteProduct: 'Delete Product',
    productDetails: 'Product Details',
    addedBy: 'Added by',
    date: 'Date',
    time: 'Time',
    you: 'You',
    shareList: 'Share List',
    inviteFriends: 'Invite Friends',
    shareDetails: 'Share the details to join the list',
    groupCode: 'List Code',
    password: 'Password',
    copy: 'Copy',
    copied: 'Copied!',
    members: 'Members',
    admin: 'Admin',
    online: 'Online',
    removeMember: 'Remove Member',
    leaveGroup: 'Leave List',
    deleteGroup: 'Delete List',
    deleteList: 'Delete List',
    listName: 'List Name',
    groupName: 'List Name',
    icon: 'Icon',
    color: 'Color',
    saveChanges: 'Save Changes',
    editList: 'Edit List',
    editGroup: 'Edit List',
    groupSettings: 'List Settings',
    allDone: 'Great job!',
    allDoneDesc: 'All products have been purchased',
    noProducts: 'No products',
    noProductsDesc: 'Add new products to the list',
    noSearchResults: 'No results found',
    noSearchResultsDesc: 'Try a different search term',
    noPurchasedProducts: 'No purchased products',
    noPurchasedProductsDesc: 'Items you mark as purchased will appear here',
    swipeHint: 'Tip: Swipe left for actions • Tap for details',
    // Profile
    profile: 'Profile',
    editProfile: 'Edit Profile',
    name: 'Name',
    email: 'Email',
    logout: 'Logout',
    logoutConfirm: 'Logout from account?',
    // Auth
    login: 'Login',
    register: 'Register',
    welcomeBack: 'Welcome Back!',
    createAccount: 'Create Account',
    // Units
    unitPiece: 'pcs',
    unitKg: 'kg',
    unitGram: 'g',
    unitLiter: 'L',
    // Categories
    catDairy: 'Dairy',
    catBakery: 'Bakery',
    catVegetables: 'Vegetables',
    catFruits: 'Fruits',
    catMeat: 'Meat',
    catBeverages: 'Beverages',
    catSweets: 'Sweets',
    catCleaning: 'Cleaning',
    catOther: 'Other',
    // Toasts
    added: 'Added',
    adding: 'Adding...',
    saved: 'Saved',
    deleted: 'Deleted',
    updated: 'Updated',
    removed: 'Removed',
    copyError: 'Copy error',
    // Errors
    enterListName: 'Please enter a list name',
    nameTooShort: 'Name must be at least 2 characters',
    enterProductName: 'Please enter a product name',
    productNameTooShort: 'Product name must be at least 2 characters',
    quantityMin: 'Quantity must be at least 1',
    enterCodeAndPassword: 'Please enter code and password',
    enterCodeAndPasswordHint: 'Enter the code and password you received',
    groupNotFound: 'List not found',
    wrongPassword: 'Wrong password',
    useGoogleSignIn: 'This account was created with Google. Please use Google Sign-In.',
    alreadyInGroup: 'You are already in this list',
    userNotLoggedIn: 'User not logged in',
    unknownError: 'Unknown error',
    tooManyAttempts: 'Too many attempts, please try again later',
    invalidGroupCode: 'Invalid list code',
    invalidGroupPassword: 'Invalid list password',
    alreadyMember: 'You are already a member of this list',
    youAreOwner: 'You are the owner of this list',
    or: 'or',
    enterEmail: 'Please enter email',
    invalidEmail: 'Invalid email',
    enterPassword: 'Please enter password',
    enterName: 'Please enter name',
    passwordTooShort: 'Password must be at least 8 characters',
    confirmPassword: 'Please confirm password',
    passwordMismatch: 'Passwords do not match',
    emailExists: 'This email already exists',
    didYouMean: 'Did you mean',
    removeMemberConfirm: 'Remove {name} from the list?',
    leaveGroupConfirm: 'Leave the list?',
    makeAdmin: 'Make Admin',
    removeAdmin: 'Remove Admin',
    makeAllAdmins: 'Make All Admins',
    whatToCreate: 'What would you like to create?',
    loginWithoutGoogle: 'Login without Google',
    hideEmailLogin: 'Hide',
    return: 'Return',
    profileUpdated: 'Profile updated',
    created: 'Created',
    joinedGroup: 'Joined list',
    left: 'Left',
    // Socket notifications
    addedProductNotif: 'added',
    editedProductNotif: 'edited',
    deletedProductNotif: 'deleted',
    purchasedNotif: 'marked as purchased',
    unmarkedPurchasedNotif: 'unmarked',
    joinedGroupNotif: 'joined the list',
    leftGroupNotif: 'left the list',
    removedFromGroupNotif: 'You were removed from the list',
    removedYouNotif: 'removed you from the list',
    deletedGroupNotif: 'deleted the list',
    listUpdatedNotif: 'updated list settings',
    groupDeletedNotif: 'List was deleted',
    inListNotif: 'in list',
    deleteGroupTitle: 'Delete List',
    deleteListTitle: 'Delete List',
    deleteConfirmMessage: 'This action cannot be undone',
    deleteDataWarning: 'This will:\n• Delete all your private lists\n• Transfer shared lists you own to another member\n• Remove you from lists you joined\n• Delete all settings and preferences\n• Delete your account permanently\n\nThis action cannot be undone!',
    errorOccurred: 'An error occurred',
    noNotifications: 'No new notifications',
    home: 'Home',
    new: 'New',
    markAllAsRead: 'Mark all as read',
    // Legal
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    consentTitle: 'Data Usage Consent',
    consentDescription: 'We use local storage (LocalStorage) to save your preferences and app data on your device. The information stays on your device and is not sent to external servers.',
    accept: 'Accept',
    legal: 'Legal',
    // Admin Dashboard
    adminDashboard: 'Admin Dashboard',
    loginActivity: 'Login Activity',
    totalUsers: 'Total Users',
    loginsToday: 'Logins Today',
    loginsThisMonth: 'Logins This Month',
    onlineNow: 'Online Now',
    allActivity: 'All Activity',
    dailyView: 'Daily',
    monthlyView: 'Monthly',
    hourlyView: 'Hourly',
    noActivityFound: 'No activity found',
    loginMethod: 'Login Method',
    viaEmail: 'Via Email',
    viaGoogle: 'Via Google',
    selectMonth: 'Select Month',
    selectDate: 'Select Date',
    selectHour: 'Select Hour',
    uniqueUsersToday: 'Active Users Today',
    uniqueUsersThisMonth: 'Active Users This Month',
    registeredUsers: 'Registered Users',
    lastLogin: 'Last Login',
    neverLoggedIn: 'Never logged in',
    refreshData: 'Refresh Data',
    searchCustomer: 'Search customer...',
    // Error Boundary
    errorTitle: 'Something went wrong',
    errorDescription: 'An unexpected error occurred. Try refreshing the page or going back.',
    tryAgain: 'Try Again',
    refreshPage: 'Refresh Page',
    showErrorDetails: 'Show error details',
    hideErrorDetails: 'Hide error details',
    copyErrorDetails: 'Copy error details',
    copiedToClipboard: 'Copied!',
    copyAndSendToSupport: 'Copy and send error details to support',
    clearCacheAndReload: 'Clear cache & reload',
    updatingVersion: 'Updating version...',
    // Auth
    continueWithGoogle: 'Continue with Google',
    newUserHint: 'New user? Enter name and password to register',
    returningUserHint: 'Welcome back! Enter password to login',
    continue: 'Continue',
    change: 'Change',
    networkError: 'Check your internet connection',
    passwordWeak: 'Weak',
    passwordMedium: 'Medium',
    passwordStrong: 'Strong',
    googleLoginError: 'Error signing in with Google',
    localStorageError: 'Cannot save login details. Check that your browser allows data storage.',
    cacheError: 'Connection issue. Try clearing cache:',
    noUserData: 'Error: No user data received from server',
    offlineMessage: 'No internet connection',
    // Clear Cache Page
    clearCacheTitle: 'Clear Cache',
    clearCacheSubtitle: 'Clearing saved data...',
    clearCacheDone: 'Cleanup Complete!',
    clearCacheRedirect: 'Redirecting to home in',
    clearCacheStepSW: 'Unregistering Service Workers',
    clearCacheStepCaches: 'Clearing browser caches',
    clearCacheStepStorage: 'Clearing local storage',
    clearCacheStepSession: 'Clearing session storage',
    clearCacheStepCookies: 'Clearing cookies',
    // Share
    shareListDescription: 'Share your shopping list',
    // Quick Add
    quickAddPlaceholder: 'Quick add product...',
    searchProducts: 'Search products...',
    // What's New
    whatsNewTitle: "What's New?",
    letsStart: "Great, let's start!",
    // Time formatting
    timeNow: 'Now',
    timeMinutesAgo: '{count}m ago',
    timeHoursAgo: 'Today {time}',
    timeYesterday: 'Yesterday',
    timeDaysAgo: '{count}d ago',
    timeWeeksAgo: '{count}w ago',
    timeMonthsAgo: '{count}mo ago',
    // Push notification prompt
    pushNotifBlocked: 'Notifications Blocked',
    pushNotifBlockedDesc: 'To enable notifications, allow them in\nBrowser Settings → Permissions → Notifications',
    pushNotifBenefits: 'Get notified about changes in your lists even when the app is closed',
    gotIt: 'Got it',
    notNow: 'Not now',
    // Join group hints
    sixChars: '6 characters',
    fourDigits: '4 digits',
    // Push settings
    pushNotifications: 'Push Notifications',
    pushActive: 'Active',
    pushDescription: 'Receive notifications when app is closed',
    pushNotSupported: '* Not supported.\niPhone: Tap Share → "Add to Home Screen" and open from there',
    pushBlocked: '⚠️ Notifications blocked.\nBrowser Settings → Permissions → Notifications → Allow',
    pushErrorNotConfigured: '* Push notifications not configured on server',
    pushErrorSaveFailed: '* Failed to save subscription',
    pushErrorSubscribeFailed: '* Push service subscription failed. Try logging out, reinstalling the app, and logging back in',
    pushErrorUnknown: '* Unknown error',
    pushRequiresInstall: 'To receive Push notifications, install the app to your home screen',
    pushInstallAndroid: 'In browser menu (⋮) → "Install app" or "Add to Home Screen"',
    pushInstallIOS: 'Tap the Share button (⎋) → "Add to Home Screen"',
    pushInstallDesktop: 'Click the install icon (⊕) in the browser address bar',
    // Notification counts
    newNotification: 'new notification',
    newNotifications: 'new notifications',
    // Empty notification state
    noNotificationsYet: "When there are new updates\nin your lists, they'll appear here",
    // Clear cache
    clearCacheRefresh: 'Clear cache & refresh',
    // Admin inline
    today: 'Today',
    yesterday: 'Yesterday',
    logins: 'Logins',
    loginMethodLabel: 'Login method:',
    adminLoadError: 'Failed to load admin data',
    // WhatsApp share
    listCompleted: 'List completed',
    sessionExpired: 'Session expired, please log in again',
    convertToGroup: 'Convert to shared list',
    convertToGroupHint: 'Share this list with others',
    setGroupPassword: 'Set group password (4 digits)',
    productExists: 'Product exists',
    productExistsMessage: '"{name}" is already in the list ({quantity} {unit}). What to do?',
    increaseQuantity: 'Increase quantity',
    addAnyway: 'Add anyway',
    refresh: 'Refresh',
  },
  ru: {
    // General
    appName: 'SmartBasket',
    version: 'Версия',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    close: 'Закрыть',
    back: 'Назад',
    confirm: 'Подтвердить',
    yes: 'Да',
    no: 'Нет',
    // Settings
    settings: 'Настройки',
    notifications: 'Уведомления',
    darkMode: 'Тёмный режим',
    language: 'Язык',
    helpSupport: 'Помощь и поддержка',
    about: 'О приложении',
    deleteAllData: 'Удалить все данные',
    notificationSettings: 'Настройки уведомлений',
    enableNotifications: 'Включить уведомления',
    groupNotifications: 'Уведомления списка',
    memberJoined: 'Присоединился к списку',
    memberLeft: 'Покинул список',
    memberRemoved: 'Был удалён из списка',
    memberJoinedNotif: 'Участник присоединился к списку',
    memberLeftNotif: 'Участник покинул список',
    memberRemovedNotif: 'Участник удалён из списка',
    groupDeletedNotifSetting: 'Список удалён',
    listUpdatedNotifSetting: 'Изменение настроек списка',
    enableAll: 'Включить все',
    disableAll: 'Отключить все',
    productNotifications: 'Уведомления о товарах',
    productAdded: 'Товар добавлен',
    productDeleted: 'Товар удалён',
    productEdited: 'Товар изменён',
    productPurchased: 'Товар куплен',
    muteGroup: 'Отключить уведомления списка',
    unmuteGroup: 'Включить уведомления списка',
    groupMuted: 'Уведомления списка отключены',
    notificationsOff: 'Уведомления отключены в основных настройках',
    // Help & Support
    contactUs: 'Связаться с нами',
    sendEmail: 'Отправить email',
    sendWhatsApp: 'Отправить WhatsApp',
    helpDescription: 'Мы рады помочь! Свяжитесь с нами по любым вопросам.',
    // About
    aboutDescription: 'Просто, удобно, вместе - умный список покупок',
    developedBy: 'Разработано',
    allRightsReserved: 'Все права защищены',
    // Home
    hello: 'Привет,',
    search: 'Поиск...',
    all: 'Все',
    myLists: 'Мои списки',
    groups: 'Совместные',
    createList: 'Создать список',
    createGroup: 'Создать совместный список',
    newGroup: 'Новый совместный список',
    joinGroup: 'Присоединиться к списку',
    privateList: 'Личный список',
    privateListDesc: 'Создайте личный список покупок только для себя',
    sharedGroup: 'Совместный список',
    sharedGroupDesc: 'Создайте список и делитесь с семьёй и друзьями',
    joinExistingGroup: 'Присоединиться к списку',
    joinExistingGroupDesc: 'Есть код приглашения? Введите его здесь',
    noLists: 'Пока нет списков',
    noListsDesc: 'Начните с создания нового списка покупок',
    noGroups: 'Пока нет совместных списков',
    noGroupsDesc: 'Начните с совместного списка и делайте покупки с семьёй и друзьями',
    createFirstList: 'Создать первый список',
    createFirstGroup: 'Создать совместный список',
    items: 'товаров',
    listsCount: 'списков',
    completed: 'Завершено',
    group: 'Совместный',
    private: 'Личный',
    // List
    toBuy: 'Купить',
    purchased: 'Куплено',
    addProduct: 'Добавить товар',
    newProduct: 'Новый товар',
    productName: 'Название товара',
    quantity: 'Количество',
    unit: 'Единица',
    category: 'Категория',
    add: 'Добавить',
    editProduct: 'Редактировать товар',
    deleteProduct: 'Удалить товар',
    productDetails: 'Детали товара',
    addedBy: 'Добавлено',
    date: 'Дата',
    time: 'Время',
    you: 'Вы',
    shareList: 'Поделиться списком',
    inviteFriends: 'Пригласить друзей',
    shareDetails: 'Поделитесь данными для присоединения к списку',
    groupCode: 'Код списка',
    password: 'Пароль',
    copy: 'Копировать',
    copied: 'Скопировано!',
    members: 'Участники',
    admin: 'Админ',
    online: 'В сети',
    removeMember: 'Удалить участника',
    leaveGroup: 'Покинуть список',
    deleteGroup: 'Удалить список',
    deleteList: 'Удалить список',
    listName: 'Название списка',
    groupName: 'Название списка',
    icon: 'Иконка',
    color: 'Цвет',
    saveChanges: 'Сохранить изменения',
    editList: 'Редактировать список',
    editGroup: 'Редактировать список',
    groupSettings: 'Настройки списка',
    allDone: 'Отлично!',
    allDoneDesc: 'Все товары куплены',
    noProducts: 'Нет товаров',
    noProductsDesc: 'Добавьте новые товары в список',
    noSearchResults: 'Ничего не найдено',
    noSearchResultsDesc: 'Попробуйте другой запрос',
    noPurchasedProducts: 'Нет купленных товаров',
    noPurchasedProductsDesc: 'Товары, отмеченные как купленные, появятся здесь',
    swipeHint: 'Совет: Свайп влево для действий • Нажмите для деталей',
    // Profile
    profile: 'Профиль',
    editProfile: 'Редактировать профиль',
    name: 'Имя',
    email: 'Email',
    logout: 'Выйти',
    logoutConfirm: 'Выйти из аккаунта?',
    // Auth
    login: 'Войти',
    register: 'Регистрация',
    welcomeBack: 'С возвращением!',
    createAccount: 'Создать аккаунт',
    // Units
    unitPiece: 'шт',
    unitKg: 'кг',
    unitGram: 'г',
    unitLiter: 'л',
    // Categories
    catDairy: 'Молочные',
    catBakery: 'Выпечка',
    catVegetables: 'Овощи',
    catFruits: 'Фрукты',
    catMeat: 'Мясо',
    catBeverages: 'Напитки',
    catSweets: 'Сладости',
    catCleaning: 'Уборка',
    catOther: 'Другое',
    // Toasts
    added: 'Добавлено',
    adding: 'Добавление...',
    saved: 'Сохранено',
    deleted: 'Удалено',
    updated: 'Обновлено',
    removed: 'Удалено',
    copyError: 'Ошибка копирования',
    // Errors
    enterListName: 'Введите название списка',
    nameTooShort: 'Название должно содержать минимум 2 символа',
    enterProductName: 'Введите название товара',
    productNameTooShort: 'Название товара должно содержать минимум 2 символа',
    quantityMin: 'Количество должно быть минимум 1',
    enterCodeAndPassword: 'Введите код и пароль',
    enterCodeAndPasswordHint: 'Введите код и пароль, которые вы получили',
    groupNotFound: 'Список не найден',
    wrongPassword: 'Неверный пароль',
    useGoogleSignIn: 'Этот аккаунт был создан через Google. Пожалуйста, войдите через Google.',
    alreadyInGroup: 'Вы уже в этом списке',
    userNotLoggedIn: 'Пользователь не авторизован',
    unknownError: 'Неизвестная ошибка',
    tooManyAttempts: 'Слишком много попыток, попробуйте позже',
    invalidGroupCode: 'Неверный код списка',
    invalidGroupPassword: 'Неверный пароль списка',
    alreadyMember: 'Вы уже являетесь участником этого списка',
    youAreOwner: 'Вы владелец этого списка',
    or: 'или',
    enterEmail: 'Введите email',
    invalidEmail: 'Неверный email',
    enterPassword: 'Введите пароль',
    enterName: 'Введите имя',
    passwordTooShort: 'Пароль должен содержать минимум 8 символов',
    confirmPassword: 'Подтвердите пароль',
    passwordMismatch: 'Пароли не совпадают',
    emailExists: 'Этот email уже существует',
    didYouMean: 'Возможно вы имели в виду',
    removeMemberConfirm: 'Удалить {name} из списка?',
    leaveGroupConfirm: 'Покинуть список?',
    makeAdmin: 'Сделать админом',
    removeAdmin: 'Убрать админа',
    makeAllAdmins: 'Сделать всех админами',
    whatToCreate: 'Что вы хотите создать?',
    loginWithoutGoogle: 'Войти без Google',
    hideEmailLogin: 'Скрыть',
    return: 'Вернуть',
    profileUpdated: 'Профиль обновлён',
    created: 'Создано',
    joinedGroup: 'Вы присоединились к списку',
    left: 'Вы покинули',
    // Socket notifications
    addedProductNotif: 'добавил(а)',
    editedProductNotif: 'изменил(а)',
    deletedProductNotif: 'удалил(а)',
    purchasedNotif: 'отметил(а) как купленный',
    unmarkedPurchasedNotif: 'снял(а) отметку',
    joinedGroupNotif: 'присоединился(ась) к списку',
    leftGroupNotif: 'покинул(а) список',
    removedFromGroupNotif: 'Вы были удалены из списка',
    removedYouNotif: 'удалил(а) вас из списка',
    deletedGroupNotif: 'удалил(а) список',
    listUpdatedNotif: 'обновил(а) настройки списка',
    groupDeletedNotif: 'Список был удалён',
    inListNotif: 'в списке',
    deleteGroupTitle: 'Удалить список',
    deleteListTitle: 'Удалить список',
    deleteConfirmMessage: 'Это действие нельзя отменить',
    deleteDataWarning: 'Это действие:\n• Удалит все ваши личные списки\n• Передаст ваши совместные списки другому участнику\n• Удалит вас из списков, в которых вы состоите\n• Удалит все настройки и предпочтения\n• Удалит ваш аккаунт навсегда\n\nЭто действие нельзя отменить!',
    errorOccurred: 'Произошла ошибка',
    noNotifications: 'Нет новых уведомлений',
    home: 'Главная',
    new: 'Новый',
    markAllAsRead: 'Отметить все как прочитанное',
    // Legal
    privacyPolicy: 'Политика конфиденциальности',
    termsOfService: 'Условия использования',
    consentTitle: 'Согласие на использование данных',
    consentDescription: 'Мы используем локальное хранилище (LocalStorage) для сохранения ваших настроек и данных приложения на вашем устройстве. Информация остаётся на вашем устройстве и не отправляется на внешние серверы.',
    accept: 'Принять',
    legal: 'Правовая информация',
    // Admin Dashboard
    adminDashboard: 'Панель администратора',
    loginActivity: 'Активность входа',
    totalUsers: 'Всего пользователей',
    loginsToday: 'Входов сегодня',
    loginsThisMonth: 'Входов в этом месяце',
    onlineNow: 'Онлайн сейчас',
    allActivity: 'Вся активность',
    dailyView: 'По дням',
    monthlyView: 'По месяцам',
    hourlyView: 'По часам',
    noActivityFound: 'Активность не найдена',
    loginMethod: 'Метод входа',
    viaEmail: 'Через Email',
    viaGoogle: 'Через Google',
    selectMonth: 'Выберите месяц',
    selectDate: 'Выберите дату',
    selectHour: 'Выберите час',
    uniqueUsersToday: 'Активных пользователей сегодня',
    uniqueUsersThisMonth: 'Активных пользователей в этом месяце',
    registeredUsers: 'Зарегистрированные пользователи',
    lastLogin: 'Последний вход',
    neverLoggedIn: 'Никогда не входил',
    refreshData: 'Обновить данные',
    searchCustomer: 'Поиск клиента...',
    // Error Boundary
    errorTitle: 'Что-то пошло не так',
    errorDescription: 'Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться назад.',
    tryAgain: 'Попробовать снова',
    refreshPage: 'Обновить страницу',
    showErrorDetails: 'Показать детали ошибки',
    hideErrorDetails: 'Скрыть детали ошибки',
    copyErrorDetails: 'Копировать детали ошибки',
    copiedToClipboard: 'Скопировано!',
    copyAndSendToSupport: 'Скопируйте и отправьте детали ошибки в поддержку',
    clearCacheAndReload: 'Очистить кэш и обновить',
    updatingVersion: 'Обновление версии...',
    // Auth
    continueWithGoogle: 'Продолжить с Google',
    newUserHint: 'Новый пользователь? Введите имя и пароль для регистрации',
    returningUserHint: 'С возвращением! Введите пароль для входа',
    continue: 'Продолжить',
    change: 'Изменить',
    networkError: 'Проверьте подключение к интернету',
    passwordWeak: 'Слабый',
    passwordMedium: 'Средний',
    passwordStrong: 'Сильный',
    googleLoginError: 'Ошибка входа через Google',
    localStorageError: 'Невозможно сохранить данные входа. Проверьте, что браузер разрешает сохранение данных.',
    cacheError: 'Проблема соединения. Очистите кэш:',
    noUserData: 'Ошибка: данные пользователя не получены от сервера',
    offlineMessage: 'Нет подключения к интернету',
    // Clear Cache Page
    clearCacheTitle: 'Очистка кэша',
    clearCacheSubtitle: 'Очистка сохранённых данных...',
    clearCacheDone: 'Очистка завершена!',
    clearCacheRedirect: 'Переход на главную через',
    clearCacheStepSW: 'Отмена регистрации Service Workers',
    clearCacheStepCaches: 'Очистка кэша браузера',
    clearCacheStepStorage: 'Очистка локального хранилища',
    clearCacheStepSession: 'Очистка сессионного хранилища',
    clearCacheStepCookies: 'Очистка cookies',
    // Share
    shareListDescription: 'Поделитесь своим списком покупок',
    // Quick Add
    quickAddPlaceholder: 'Быстро добавить товар...',
    searchProducts: 'Поиск товаров...',
    // What's New
    whatsNewTitle: 'Что нового?',
    letsStart: 'Отлично, начнём!',
    // Time formatting
    timeNow: 'Сейчас',
    timeMinutesAgo: '{count} мин. назад',
    timeHoursAgo: 'Сегодня {time}',
    timeYesterday: 'Вчера',
    timeDaysAgo: '{count} дн. назад',
    timeWeeksAgo: '{count} нед. назад',
    timeMonthsAgo: '{count} мес. назад',
    // Push notification prompt
    pushNotifBlocked: 'Уведомления заблокированы',
    pushNotifBlockedDesc: 'Чтобы включить уведомления, разрешите их\nв настройках браузера → Разрешения → Уведомления',
    pushNotifBenefits: 'Получайте уведомления об изменениях в списках, даже когда приложение закрыто',
    gotIt: 'Понятно',
    notNow: 'Не сейчас',
    // Join group hints
    sixChars: '6 символов',
    fourDigits: '4 цифры',
    // Push settings
    pushNotifications: 'Push-уведомления',
    pushActive: 'Активно',
    pushDescription: 'Получать уведомления когда приложение закрыто',
    pushNotSupported: '* Не поддерживается.\niPhone: нажмите "Поделиться" → "На экран Домой"',
    pushBlocked: '⚠️ Уведомления заблокированы.\nНастройки браузера → Разрешения → Уведомления',
    pushErrorNotConfigured: '* Push-уведомления не настроены на сервере',
    pushErrorSaveFailed: '* Не удалось сохранить подписку',
    pushErrorSubscribeFailed: '* Подписка на push-уведомления не удалась. Попробуйте выйти, удалить приложение, установить заново и войти снова',
    pushErrorUnknown: '* Неизвестная ошибка',
    pushRequiresInstall: 'Для Push-уведомлений установите приложение на главный экран',
    pushInstallAndroid: 'В меню браузера (⋮) → "Установить приложение" или "На главный экран"',
    pushInstallIOS: 'Нажмите кнопку "Поделиться" (⎋) → "На экран Домой"',
    pushInstallDesktop: 'Нажмите значок установки (⊕) в адресной строке браузера',
    // Notification counts
    newNotification: 'новое уведомление',
    newNotifications: 'новых уведомлений',
    // Empty notification state
    noNotificationsYet: 'Когда появятся обновления\nв ваших списках, они будут здесь',
    // Clear cache
    clearCacheRefresh: 'Очистить кэш',
    // Admin inline
    today: 'Сегодня',
    yesterday: 'Вчера',
    logins: 'Входы',
    loginMethodLabel: 'Способ входа:',
    adminLoadError: 'Ошибка загрузки данных',
    // WhatsApp share
    listCompleted: 'Список завершён',
    sessionExpired: 'Сессия истекла, войдите снова',
    convertToGroup: 'Сделать совместным списком',
    convertToGroupHint: 'Поделитесь списком с другими',
    setGroupPassword: 'Установите пароль группы (4 цифры)',
    productExists: 'Продукт существует',
    productExistsMessage: '"{name}" уже в списке ({quantity} {unit}). Что делать?',
    increaseQuantity: 'Увеличить количество',
    addAnyway: 'Добавить всё равно',
    refresh: 'Обновить',
  }
};

export type TranslationKeys = TranslationKey;
