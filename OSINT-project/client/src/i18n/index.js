import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ur from './ur.json';
import urRoman from './ur-roman.json';
import en from './en.json';

const savedLang = localStorage.getItem('lang') || 'ur-roman';

i18n.use(initReactI18next).init({
  resources: {
    ur: { translation: ur },
    'ur-roman': { translation: urRoman },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;