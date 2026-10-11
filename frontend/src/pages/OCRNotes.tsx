import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ScanLine,
    Check,
    X,
    AlertCircle,
    FileImage,
    Sparkles,
    ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FileUploader } from '../components/FileUploader';
import { GradeResult } from '../components/GradeResult';
import { analyzeGrade, noteService } from '../services/api';
import { notify } from '../utils/toast';

interface GradeResultData {
    data: {
        eleves: Array<{
            name: string;
            note: number;
            max?: number;
            appreciation?: string;
        }>;
    };
}

const OCRNotes = () => {
    const { user } = useAuth();
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<GradeResultData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleConfirmSave = async (refinedEleves?: any[]) => {
        const elevesToSave = refinedEleves || result?.data?.eleves || result?.eleves;
        
        if (!elevesToSave || elevesToSave.length === 0) {
            setResult(null);
            return;
        }
        
        setAnalyzing(true);
        setError(null);
        
        try {
            for (const eleve of elevesToSave) {
                await noteService.create({
                    studentName: eleve.name,
                    studentId: 'unknown',
                    value: eleve.note,
                    maxGrade: eleve.max || 20,
                    teacherComments: eleve.appreciation || '',
                    teacherId: user?.uid || 'anonymous',
                    source: 'ocr'
                });
            }
            setResult(null);
            notify.success(`${elevesToSave.length} note(s) enregistrée(s) avec succès !`);
        } catch (err: any) {
            console.error("Erreur lors de la sauvegarde :", err);
            const msg = "Impossible d'enregistrer les notes dans la base de données.";
            setError(msg);
            notify.error(msg);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleFileUpload = async (base64: string) => {
        setAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const data = await analyzeGrade(base64, user?.uid || "anonymous");
            setResult(data);
        } catch (err: any) {
            console.error("OCR Analysis Error:", err);
            setError(err.message || "Une erreur est survenue lors de l'analyse IA. Vérifiez que le serveur backend est actif.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <ScanLine size={20} strokeWidth={2.2} />
                        </div>
                        Saisie des notes par IA
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Téléverse une photo d'un relevé de notes — l'IA extrait automatiquement les élèves et leurs notes.
                    </p>
                </div>

                <div className="hidden md:flex items-center gap-3 bg-white/60 px-3 py-2 rounded-xl border border-slate-100 shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-slate-600">Service IA actif</span>
                </div>
            </div>

            {/* Notification Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                    >
                        <div className="bg-red-500 text-white p-1.5 rounded-lg shrink-0">
                            <AlertCircle size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-red-900 text-sm mb-0.5">Erreur d'analyse</h3>
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-600 p-1 rounded-lg transition-colors shrink-0"
                            aria-label="Fermer"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-4xl mx-auto w-full">
                {!result ? (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12"
                    >
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                                <Sparkles size={28} strokeWidth={1.8} />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                                Numérise un relevé de notes
                            </h3>
                            <p className="text-slate-500 text-sm max-w-md">
                                Importe une photo (JPG/PNG) ou un PDF. L'IA détecte les élèves et leurs notes, et tu valides avant l'enregistrement.
                            </p>
                        </div>

                        <div className="max-w-2xl mx-auto">
                            <FileUploader onUpload={handleFileUpload} isLoading={analyzing} />
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <motion.div
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <Check size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Analyse terminée
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Vérifie les données extraites avant d'enregistrer</p>
                                </div>
                            </motion.div>
                            <button
                                onClick={() => setResult(null)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                            >
                                <ArrowRight className="rotate-180" size={16} />
                                Recommencer
                            </button>
                        </div>

                        <GradeResult
                            data={result}
                            onConfirm={handleConfirmSave}
                            onCancel={() => setResult(null)}
                        />
                    </div>
                )}
            </div>

            {/* Conseils d'utilisation */}
            {!result && !analyzing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                            <FileImage size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 text-sm mb-1">Conseil photo</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Document à plat, bien éclairé, texte net. Évite les ombres et les angles obliques.
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 text-sm mb-1">Vérification recommandée</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                L'IA peut se tromper sur les noms manuscrits. Relis et corrige avant d'enregistrer.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OCRNotes;
