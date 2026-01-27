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
  | 'productNotifications'
  | 'productAdded'
  | 'productDeleted'
  | 'productEdited'
  | 'productPurchased'
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
  | 'allDone'
  | 'allDoneDesc'
  | 'noProducts'
  | 'noProductsDesc'
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
  | 'alreadyInGroup'
  | 'userNotLoggedIn'
  | 'unknownError'
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
  | 'deleteGroupTitle'
  | 'deleteListTitle'
  | 'deleteConfirmMessage'
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
  | 'legal';

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
    groupNotifications: 'התראות קבוצות',
    memberJoined: 'חבר הצטרף',
    memberLeft: 'חבר עזב',
    productNotifications: 'התראות מוצרים',
    productAdded: 'מוצר נוסף',
    productDeleted: 'מוצר נמחק',
    productEdited: 'מוצר נערך',
    productPurchased: 'מוצר נקנה',
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
    search: 'חפש...',
    all: 'הכל',
    myLists: 'שלי',
    groups: 'קבוצות',
    createList: 'צור רשימה',
    createGroup: 'צור קבוצה',
    newGroup: 'קבוצה חדשה',
    joinGroup: 'הצטרף לקבוצה',
    privateList: 'רשימה פרטית',
    privateListDesc: 'צור רשימת קניות אישית רק בשבילך',
    sharedGroup: 'קבוצה משותפת',
    sharedGroupDesc: 'צור קבוצה ושתף עם משפחה וחברים',
    joinExistingGroup: 'הצטרף לקבוצה קיימת',
    joinExistingGroupDesc: 'יש לך קוד הזמנה? הכנס אותו כאן',
    noLists: 'טרם נוצרו רשימות',
    noListsDesc: 'התחל ביצירת רשימת קניות חדשה ועקוב בקלות אחר הצרכים שלך',
    noGroups: 'טרם נוצרו קבוצות',
    noGroupsDesc: 'התחל בקבוצה משותפת וצור רשימות קניות עם המשפחה והחברים',
    createFirstList: 'צור רשימה ראשונה',
    createFirstGroup: 'צור קבוצה ראשונה',
    items: 'פריטים',
    completed: 'הושלם',
    group: 'קבוצה',
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
    productDetails: 'פרטי מוצר',
    addedBy: 'נוסף ע״י',
    date: 'תאריך',
    time: 'שעה',
    you: 'את/ה',
    shareList: 'שתף רשימה',
    inviteFriends: 'הזמן חברים',
    shareDetails: 'שתף את הפרטים להצטרפות לקבוצה',
    groupCode: 'קוד קבוצה',
    password: 'סיסמה',
    copy: 'העתק',
    copied: 'הועתק!',
    members: 'חברים',
    admin: 'מנהל',
    removeMember: 'הסר חבר',
    leaveGroup: 'עזוב רשימה',
    deleteGroup: 'מחק קבוצה',
    deleteList: 'מחק רשימה',
    listName: 'שם הרשימה',
    groupName: 'שם הקבוצה',
    icon: 'אייקון',
    color: 'צבע',
    saveChanges: 'שמור שינויים',
    editList: 'עריכת רשימה',
    editGroup: 'עריכת קבוצה',
    allDone: 'כל הכבוד!',
    allDoneDesc: 'כל המוצרים נקנו בהצלחה',
    noProducts: 'אין מוצרים',
    noProductsDesc: 'הוסף מוצרים חדשים לרשימה',
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
    groupNotFound: 'קבוצה לא נמצאה',
    wrongPassword: 'סיסמה שגויה',
    alreadyInGroup: 'אתה כבר בקבוצה',
    userNotLoggedIn: 'משתמש לא מחובר',
    unknownError: 'שגיאה לא ידועה',
    or: 'או',
    enterEmail: 'נא להזין אימייל',
    invalidEmail: 'אימייל לא תקין',
    enterPassword: 'נא להזין סיסמה',
    enterName: 'נא להזין שם',
    passwordTooShort: 'סיסמה חייבת להכיל לפחות 4 תווים',
    confirmPassword: 'נא לאמת סיסמה',
    passwordMismatch: 'הסיסמאות אינן תואמות',
    emailExists: 'אימייל זה כבר קיים',
    didYouMean: 'האם התכוונת ל',
    removeMemberConfirm: 'האם להסיר את {name} מהקבוצה?',
    leaveGroupConfirm: 'האם לעזוב את הקבוצה?',
    makeAdmin: 'הפוך למנהל',
    removeAdmin: 'הסר מנהל',
    makeAllAdmins: 'הפוך את כולם למנהלים',
    whatToCreate: 'מה תרצה ליצור?',
    loginWithoutGoogle: 'התחברות ללא Google',
    hideEmailLogin: 'הסתר',
    return: 'החזר',
    profileUpdated: 'הפרופיל עודכן',
    created: 'נוצר',
    joinedGroup: 'הצטרפת לקבוצה',
    left: 'עזבת',
    deleteGroupTitle: 'מחיקת קבוצה',
    deleteListTitle: 'מחיקת רשימה',
    deleteConfirmMessage: 'פעולה זו לא ניתנת לביטול',
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
    legal: 'משפטי'
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
    groupNotifications: 'Group Notifications',
    memberJoined: 'Member Joined',
    memberLeft: 'Member Left',
    productNotifications: 'Product Notifications',
    productAdded: 'Product Added',
    productDeleted: 'Product Deleted',
    productEdited: 'Product Edited',
    productPurchased: 'Product Purchased',
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
    groups: 'Groups',
    createList: 'Create List',
    createGroup: 'Create Group',
    newGroup: 'New Group',
    joinGroup: 'Join Group',
    privateList: 'Private List',
    privateListDesc: 'Create a personal shopping list just for you',
    sharedGroup: 'Shared Group',
    sharedGroupDesc: 'Create a group and share with family and friends',
    joinExistingGroup: 'Join Existing Group',
    joinExistingGroupDesc: 'Have an invite code? Enter it here',
    noLists: 'No lists yet',
    noListsDesc: 'Start by creating a new shopping list and easily track your needs',
    noGroups: 'No groups yet',
    noGroupsDesc: 'Start with a shared group and create shopping lists with family and friends',
    createFirstList: 'Create First List',
    createFirstGroup: 'Create First Group',
    items: 'items',
    completed: 'Completed',
    group: 'Group',
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
    productDetails: 'Product Details',
    addedBy: 'Added by',
    date: 'Date',
    time: 'Time',
    you: 'You',
    shareList: 'Share List',
    inviteFriends: 'Invite Friends',
    shareDetails: 'Share the details to join the group',
    groupCode: 'Group Code',
    password: 'Password',
    copy: 'Copy',
    copied: 'Copied!',
    members: 'Members',
    admin: 'Admin',
    removeMember: 'Remove Member',
    leaveGroup: 'Leave Group',
    deleteGroup: 'Delete Group',
    deleteList: 'Delete List',
    listName: 'List Name',
    groupName: 'Group Name',
    icon: 'Icon',
    color: 'Color',
    saveChanges: 'Save Changes',
    editList: 'Edit List',
    editGroup: 'Edit Group',
    allDone: 'Great job!',
    allDoneDesc: 'All products have been purchased',
    noProducts: 'No products',
    noProductsDesc: 'Add new products to the list',
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
    groupNotFound: 'Group not found',
    wrongPassword: 'Wrong password',
    alreadyInGroup: 'You are already in this group',
    userNotLoggedIn: 'User not logged in',
    unknownError: 'Unknown error',
    or: 'or',
    enterEmail: 'Please enter email',
    invalidEmail: 'Invalid email',
    enterPassword: 'Please enter password',
    enterName: 'Please enter name',
    passwordTooShort: 'Password must be at least 4 characters',
    confirmPassword: 'Please confirm password',
    passwordMismatch: 'Passwords do not match',
    emailExists: 'This email already exists',
    didYouMean: 'Did you mean',
    removeMemberConfirm: 'Remove {name} from the group?',
    leaveGroupConfirm: 'Leave the group?',
    makeAdmin: 'Make Admin',
    removeAdmin: 'Remove Admin',
    makeAllAdmins: 'Make All Admins',
    whatToCreate: 'What would you like to create?',
    loginWithoutGoogle: 'Login without Google',
    hideEmailLogin: 'Hide',
    return: 'Return',
    profileUpdated: 'Profile updated',
    created: 'Created',
    joinedGroup: 'Joined group',
    left: 'Left',
    deleteGroupTitle: 'Delete Group',
    deleteListTitle: 'Delete List',
    deleteConfirmMessage: 'This action cannot be undone',
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
    legal: 'Legal'
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
    groupNotifications: 'Уведомления группы',
    memberJoined: 'Участник присоединился',
    memberLeft: 'Участник вышел',
    productNotifications: 'Уведомления о товарах',
    productAdded: 'Товар добавлен',
    productDeleted: 'Товар удалён',
    productEdited: 'Товар изменён',
    productPurchased: 'Товар куплен',
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
    groups: 'Группы',
    createList: 'Создать список',
    createGroup: 'Создать группу',
    newGroup: 'Новая группа',
    joinGroup: 'Присоединиться',
    privateList: 'Личный список',
    privateListDesc: 'Создайте личный список покупок только для себя',
    sharedGroup: 'Общая группа',
    sharedGroupDesc: 'Создайте группу и делитесь с семьёй и друзьями',
    joinExistingGroup: 'Присоединиться к группе',
    joinExistingGroupDesc: 'Есть код приглашения? Введите его здесь',
    noLists: 'Пока нет списков',
    noListsDesc: 'Начните с создания нового списка покупок',
    noGroups: 'Пока нет групп',
    noGroupsDesc: 'Начните с общей группы и создавайте списки покупок с семьёй и друзьями',
    createFirstList: 'Создать первый список',
    createFirstGroup: 'Создать первую группу',
    items: 'товаров',
    completed: 'Завершено',
    group: 'Группа',
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
    productDetails: 'Детали товара',
    addedBy: 'Добавлено',
    date: 'Дата',
    time: 'Время',
    you: 'Вы',
    shareList: 'Поделиться списком',
    inviteFriends: 'Пригласить друзей',
    shareDetails: 'Поделитесь данными для присоединения к группе',
    groupCode: 'Код группы',
    password: 'Пароль',
    copy: 'Копировать',
    copied: 'Скопировано!',
    members: 'Участники',
    admin: 'Админ',
    removeMember: 'Удалить участника',
    leaveGroup: 'Покинуть группу',
    deleteGroup: 'Удалить группу',
    deleteList: 'Удалить список',
    listName: 'Название списка',
    groupName: 'Название группы',
    icon: 'Иконка',
    color: 'Цвет',
    saveChanges: 'Сохранить изменения',
    editList: 'Редактировать список',
    editGroup: 'Редактировать группу',
    allDone: 'Отлично!',
    allDoneDesc: 'Все товары куплены',
    noProducts: 'Нет товаров',
    noProductsDesc: 'Добавьте новые товары в список',
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
    groupNotFound: 'Группа не найдена',
    wrongPassword: 'Неверный пароль',
    alreadyInGroup: 'Вы уже в этой группе',
    userNotLoggedIn: 'Пользователь не авторизован',
    unknownError: 'Неизвестная ошибка',
    or: 'или',
    enterEmail: 'Введите email',
    invalidEmail: 'Неверный email',
    enterPassword: 'Введите пароль',
    enterName: 'Введите имя',
    passwordTooShort: 'Пароль должен содержать минимум 4 символа',
    confirmPassword: 'Подтвердите пароль',
    passwordMismatch: 'Пароли не совпадают',
    emailExists: 'Этот email уже существует',
    didYouMean: 'Возможно вы имели в виду',
    removeMemberConfirm: 'Удалить {name} из группы?',
    leaveGroupConfirm: 'Покинуть группу?',
    makeAdmin: 'Сделать админом',
    removeAdmin: 'Убрать админа',
    makeAllAdmins: 'Сделать всех админами',
    whatToCreate: 'Что вы хотите создать?',
    loginWithoutGoogle: 'Войти без Google',
    hideEmailLogin: 'Скрыть',
    return: 'Вернуть',
    profileUpdated: 'Профиль обновлён',
    created: 'Создано',
    joinedGroup: 'Вы присоединились к группе',
    left: 'Вы покинули',
    deleteGroupTitle: 'Удалить группу',
    deleteListTitle: 'Удалить список',
    deleteConfirmMessage: 'Это действие нельзя отменить',
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
    legal: 'Правовая информация'
  }
};

export type TranslationKeys = TranslationKey;
