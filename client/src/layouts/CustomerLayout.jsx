import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import CartDrawer from '../components/CartDrawer.jsx';
import Toaster from '../components/Toaster.jsx';
import api from '../lib/api.js';

export default function CustomerLayout() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get('/catalog/settings/public')
      .then(({ data }) => setSettings(data.settings))
      .catch(() => {});
  }, []);

  // Sync favicon and SEO meta tags whenever settings are updated in admin
  useEffect(() => {
    if (!settings) return;
    if (settings.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
    if (settings.metaTitle) {
      document.title = settings.metaTitle;
    }
    if (settings.metaDescription) {
      let meta = document.querySelector("meta[name='description']");
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = settings.metaDescription;
    }
    if (settings.metaKeywords) {
      let meta = document.querySelector("meta[name='keywords']");
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'keywords';
        document.head.appendChild(meta);
      }
      meta.content = settings.metaKeywords;
    }
  }, [settings]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Header settings={settings} />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-5 lg:px-6">
        <Outlet context={{ settings }} />
      </main>
      <Footer settings={settings} />
      <CartDrawer />
      <Toaster />
    </div>
  );
}
