import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhTWCommon from '@/locales/zh-TW/common.json';
import zhTWNavigation from '@/locales/zh-TW/navigation.json';
import zhTWSettings from '@/locales/zh-TW/settings.json';
import zhTWAuth from '@/locales/zh-TW/auth.json';
import zhTWDashboard from '@/locales/zh-TW/dashboard.json';
import zhTWForecast from '@/locales/zh-TW/forecast.json';
import zhTWSiteRevenue from '@/locales/zh-TW/siteRevenue.json';
import zhTWGenerationMix from '@/locales/zh-TW/generationMix.json';
import zhTWDataStatus from '@/locales/zh-TW/dataStatus.json';
import zhTWWeather from '@/locales/zh-TW/weather.json';
import zhTWWeatherMap from '@/locales/zh-TW/weatherMap.json';
import zhTWDailyCompare from '@/locales/zh-TW/dailyCompare.json';
import zhTWAccount from '@/locales/zh-TW/account.json';
import zhTWAdmin from '@/locales/zh-TW/admin.json';

import enCommon from '@/locales/en/common.json';
import enNavigation from '@/locales/en/navigation.json';
import enSettings from '@/locales/en/settings.json';
import enAuth from '@/locales/en/auth.json';
import enDashboard from '@/locales/en/dashboard.json';
import enForecast from '@/locales/en/forecast.json';
import enSiteRevenue from '@/locales/en/siteRevenue.json';
import enGenerationMix from '@/locales/en/generationMix.json';
import enDataStatus from '@/locales/en/dataStatus.json';
import enWeather from '@/locales/en/weather.json';
import enWeatherMap from '@/locales/en/weatherMap.json';
import enDailyCompare from '@/locales/en/dailyCompare.json';
import enAccount from '@/locales/en/account.json';
import enAdmin from '@/locales/en/admin.json';

import jaCommon from '@/locales/ja/common.json';
import jaNavigation from '@/locales/ja/navigation.json';
import jaSettings from '@/locales/ja/settings.json';
import jaAuth from '@/locales/ja/auth.json';
import jaDashboard from '@/locales/ja/dashboard.json';
import jaForecast from '@/locales/ja/forecast.json';
import jaSiteRevenue from '@/locales/ja/siteRevenue.json';
import jaGenerationMix from '@/locales/ja/generationMix.json';
import jaDataStatus from '@/locales/ja/dataStatus.json';
import jaWeather from '@/locales/ja/weather.json';
import jaWeatherMap from '@/locales/ja/weatherMap.json';
import jaDailyCompare from '@/locales/ja/dailyCompare.json';
import jaAccount from '@/locales/ja/account.json';
import jaAdmin from '@/locales/ja/admin.json';

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
        forecast: zhTWForecast,
        siteRevenue: zhTWSiteRevenue,
        generationMix: zhTWGenerationMix,
        dataStatus: zhTWDataStatus,
        weather: zhTWWeather,
        weatherMap: zhTWWeatherMap,
        dailyCompare: zhTWDailyCompare,
        account: zhTWAccount,
        admin: zhTWAdmin,
      },
      en: {
        common: enCommon,
        navigation: enNavigation,
        settings: enSettings,
        auth: enAuth,
        dashboard: enDashboard,
        forecast: enForecast,
        siteRevenue: enSiteRevenue,
        generationMix: enGenerationMix,
        dataStatus: enDataStatus,
        weather: enWeather,
        weatherMap: enWeatherMap,
        dailyCompare: enDailyCompare,
        account: enAccount,
        admin: enAdmin,
      },
      ja: {
        common: jaCommon,
        navigation: jaNavigation,
        settings: jaSettings,
        auth: jaAuth,
        dashboard: jaDashboard,
        forecast: jaForecast,
        siteRevenue: jaSiteRevenue,
        generationMix: jaGenerationMix,
        dataStatus: jaDataStatus,
        weather: jaWeather,
        weatherMap: jaWeatherMap,
        dailyCompare: jaDailyCompare,
        account: jaAccount,
        admin: jaAdmin,
      },
    },
    fallbackLng: 'zh-TW',
    defaultNS: 'common',
    supportedLngs: ['zh-TW', 'en', 'ja'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'hdjp-language',
    },
  });

export default i18n;
