import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhTWCommon from '@/locales/zh-TW/common.json';
import zhTWNavigation from '@/locales/zh-TW/navigation.json';
import zhTWSettings from '@/locales/zh-TW/settings.json';
import zhTWAuth from '@/locales/zh-TW/auth.json';
import zhTWDashboard from '@/locales/zh-TW/dashboard.json';
import zhTWAccount from '@/locales/zh-TW/account.json';
import zhTWAdmin from '@/locales/zh-TW/admin.json';

import enCommon from '@/locales/en/common.json';
import enNavigation from '@/locales/en/navigation.json';
import enSettings from '@/locales/en/settings.json';
import enAuth from '@/locales/en/auth.json';
import enDashboard from '@/locales/en/dashboard.json';
import enAccount from '@/locales/en/account.json';
import enAdmin from '@/locales/en/admin.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': {
        common: zhTWCommon,
        navigation: zhTWNavigation,
        settings: zhTWSettings,
        auth: zhTWAuth,
        dashboard: zhTWDashboard,
        account: zhTWAccount,
        admin: zhTWAdmin,
      },
      en: {
        common: enCommon,
        navigation: enNavigation,
        settings: enSettings,
        auth: enAuth,
        dashboard: enDashboard,
        account: enAccount,
        admin: enAdmin,
      },
    },
    fallbackLng: 'zh-TW',
    defaultNS: 'common',
    supportedLngs: ['zh-TW', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'hdjp-language',
    },
  });

export default i18n;
