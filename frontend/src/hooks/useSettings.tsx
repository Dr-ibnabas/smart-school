import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService } from '../services/api';
import { resolveAssetUrl } from '../utils/url';

const SettingsContext = createContext<any>(null);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<any>({
        platform_name: 'Smart School',
        school_name: 'Collège Excellence',
        description: '',
        logo: null,
        stamp: null,
        logo_url: null,
        stamp_url: null
    });
    const [loading, setLoading] = useState(true);

    const refreshSettings = async () => {
        try {
            const response = await settingsService.get();
            // @ts-ignore
            if (response.status === 'success') {
                // @ts-ignore
                setSettings(response.settings);
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    const value = {
        settings,
        loading,
        refreshSettings,
        logoUrl: resolveAssetUrl(settings?.logo_url || settings?.logo),
        stampUrl: resolveAssetUrl(settings?.stamp_url || settings?.stamp)
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
