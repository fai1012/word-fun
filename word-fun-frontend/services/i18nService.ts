import React, { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';

type Translations = Record<string, string>;

class I18nService {
    private currentLanguage: string = 'en';
    private translations: Translations = {};
    private listeners: Array<(lang: string) => void> = [];

    constructor() {
        this.currentLanguage = localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en';
        this.t = this.t.bind(this);
        this.setLanguage = this.setLanguage.bind(this);
    }

    async init() {
        await this.loadTranslations(this.currentLanguage);
    }

    private async loadTranslations(lang: string) {
        try {
            const response = await fetch(`/messages_${lang}.properties?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`Failed to load ${lang} properties`);
            const text = await response.text();
            this.translations = this.parseProperties(text);
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to empty context or hardcoded defaults if necessary
            this.translations = {};
        }
    }

    private parseProperties(text: string): Translations {
        const lines = text.split(/\r?\n/);
        const props: Translations = {};
        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#') && line.includes('=')) {
                const [key, ...rest] = line.split('=');
                props[key.trim()] = rest.join('=').trim();
            }
        });
        return props;
    }

    t(key: string, params: any[] = []): string {
        let value = this.translations[key] || key;
        params.forEach((param, index) => {
            value = value.replace(`{${index}}`, String(param));
        });
        return value;
    }

    async setLanguage(lang: string) {
        this.currentLanguage = lang;
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
        await this.loadTranslations(lang);
        this.listeners.forEach(listener => listener(lang));
    }

    getLanguage() {
        return this.currentLanguage;
    }

    subscribe(listener: (lang: string) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
}

export const i18n = new I18nService();

export const useI18n = () => {
    const [lang, setLang] = useState(i18n.getLanguage());

    useEffect(() => {
        return i18n.subscribe((newLang) => {
            setLang(newLang);
        });
    }, []);

    return {
        t: (key: string, params: any[] = []) => i18n.t(key, params),
        setLanguage: (newLang: string) => i18n.setLanguage(newLang),
        language: lang
    };
};
