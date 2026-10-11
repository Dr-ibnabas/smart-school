import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Settings, Layout, School, FileText, Upload, Check,
    X, AlertCircle, Loader2, Image as ImageIcon, Globe, Palette
} from 'lucide-react';
import { settingsService } from '../services/api';
import { useSettings } from '../hooks/useSettings';
import { resolveAssetUrl } from '../utils/url';

interface FormData {
    platform_name: string;
    school_name: string;
    description: string;
}

const PlatformSettings = () => {
    const { settings, refreshSettings } = useSettings();
    const [formData, setFormData] = useState<FormData>({
        platform_name: '',
        school_name: '',
        description: ''
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [stampFile, setStampFile] = useState<File | null>(null);
    const [stampPreview, setStampPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' });

    useEffect(() => {
        if (settings) {
            setFormData({
                platform_name: settings.platform_name || '',
                school_name: settings.school_name || '',
                description: settings.description || ''
            });

            // Préfixe les URLs relatives via le helper centralisé.
            // (blob: et data: sont passés tels quels par resolveAssetUrl.)
            const raw = (v: any) => {
                if (!v) return null;
                if (v.startsWith('blob:') || v.startsWith('data:')) return v;
                return resolveAssetUrl(v) || null;
            };

            setLogoPreview(raw(settings.logo || settings.logo_url));
            setStampPreview(raw(settings.stamp || settings.stamp_url));
        }
    }, [settings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setStampFile(file);
            setStampPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            // Update Text Settings
            const res = await settingsService.update(formData);

            // Upload Logo if changed
            if (logoFile) {
                const logoRes = await settingsService.uploadLogo(logoFile);
                if (logoRes.status !== 'success') {
                    throw new Error(logoRes.message || "Erreur lors de l'upload du logo.");
                }
            }

            // Upload Stamp if changed
            if (stampFile) {
                const stampRes = await settingsService.uploadStamp(stampFile);
                if (stampRes.status !== 'success') {
                    throw new Error(stampRes.message || "Erreur lors de l'upload du tampon.");
                }
            }

            if (res.status === 'success') {
                setMessage({ text: 'Paramètres mis à jour avec succès !', type: 'success' });
                refreshSettings();
            } else {
                setMessage({ text: res.message || 'Erreur lors de la mise à jour.', type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message || 'Une erreur est survenue.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
            <div>
                <h1 className="page-title mb-1">
                    <div className="page-title-icon">
                        <Settings className="text-primary" size={20} />
                    </div>
                    Configuration
                </h1>
                <p className="page-subtitle">Personnalise l'apparence et les informations de ton établissement.</p>
            </div>

            {message.text && (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl flex items-center justify-between text-sm ${
                        message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                        <span className="font-medium">{message.text}</span>
                    </div>
                    <button
                        onClick={() => setMessage({ text: '', type: '' })}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Fermer"
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Identité visuelle */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="surface p-5">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center mb-3">
                            <Palette size={16} className="mr-2 text-primary" />
                            Logo de l'école
                        </h3>
                        <div className="relative aspect-square rounded-xl bg-slate-50 overflow-hidden border border-slate-100 group">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Aperçu logo" className="w-full h-full object-contain p-3" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon size={40} className="text-slate-300" />
                                </div>
                            )}
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Upload size={20} className="text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">PNG ou JPG, 2 Mo max.</p>
                    </div>

                    <div className="surface p-5">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">Tampon du chef d'établissement</h3>
                        <div className="relative group mx-auto w-28 h-28">
                            <div className="w-28 h-28 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-colors group-hover:border-primary/40">
                                {stampPreview ? (
                                    <img src={stampPreview} alt="Aperçu tampon" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <ImageIcon size={28} className="text-slate-300" />
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer">
                                <Upload size={18} className="text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleStampChange} />
                            </label>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 text-center">PNG avec fond transparent recommandé.</p>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                        <h4 className="flex items-center text-primary font-semibold text-xs mb-1">
                            <Globe size={14} className="mr-1.5" /> Où sont utilisés ces paramètres ?
                        </h4>
                        <p className="text-[11px] text-primary/80 leading-relaxed">
                            Page de connexion, en-tête de l'app et bulletins générés.
                        </p>
                    </div>
                </div>

                {/* Informations générales */}
                <div className="lg:col-span-2">
                    <div className="surface p-6 space-y-5">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center">
                            <Layout size={16} className="mr-2 text-primary" />
                            Informations générales
                        </h3>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom de la plateforme</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                                    <Globe size={16} />
                                </div>
                                <input
                                    type="text"
                                    name="platform_name"
                                    value={formData.platform_name}
                                    onChange={handleInputChange}
                                    placeholder="Ex : Smart School"
                                    required
                                    className="input pl-9"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom de l'établissement</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                                    <School size={16} />
                                </div>
                                <input
                                    type="text"
                                    name="school_name"
                                    value={formData.school_name}
                                    onChange={handleInputChange}
                                    placeholder="Ex : Collège DE HOLL-HOLL"
                                    required
                                    className="input pl-9"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description / devise</label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 text-slate-400 pointer-events-none">
                                    <FileText size={16} />
                                </div>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Une brève description ou la devise de l'école…"
                                    rows={4}
                                    className="input pl-9 resize-none"
                                />
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default PlatformSettings;
