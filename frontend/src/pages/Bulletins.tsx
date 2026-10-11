import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Award,
    Download,
    User,
    BookOpen,
    Loader2,
    AlertCircle,
    Check,
    ShieldCheck,
    UserCircle2,
    GraduationCap,
    FileDown,
    FileSpreadsheet,
    X,
    ChevronDown,
    FileText,
    Search
} from 'lucide-react';
// jspdf, html2canvas, xlsx : chargés en lazy (import dynamique) — ils ne sont
// utilisés qu'au clic sur les boutons "Télécharger". Ça réduit le bundle initial
// d'environ 1 Mo brut.
import { classeService, eleveService, bulletinService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { notify } from '../utils/toast';
import { resolveAssetUrl } from '../utils/url';

interface Classe {
    id: string;
    nom?: string;
    name?: string;
}

interface Eleve {
    id: string;
    nom?: string;
    prenom?: string;
    matricule?: string;
    class_id?: string;
    classe_nom?: string;
}

interface BulletinData {
    settings?: {
        logo?: string;
        stamp?: string;
        school_name?: string;
    };
    eleve?: {
        id: string;
        nom?: string;
        prenom?: string;
        matricule?: string;
        date_naissance?: string;
        genre?: string;
        classe_nom?: string;
        niveau?: string;
        redoublant?: boolean;
    };
    term?: string;
    year?: string;
    lignes?: Array<{
        matiere_nom?: string;
        teacher_nom?: string;
        teacher_prenom?: string;
        average: string | number;
        rank?: string | number;
        max_grade?: string | number;
    }>;
    moyenne_generale?: string | number;
    overall_rank?: string | number;
    date_generation?: string;
}

const Bulletins = () => {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    const [classes, setClasses] = useState<Classe[]>([]);
    const [eleves, setEleves] = useState<Eleve[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Trimestre 1');

    const [bulletin, setBulletin] = useState<BulletinData | null>(null);
    const [loading, setLoading] = useState(false);
    const [pdfExporting, setPdfExporting] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [fetchingOptions, setFetchingOptions] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' });
    const bulletinRef = useRef<HTMLDivElement>(null);
    const batchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setFetchingOptions(true);
        try {
            const [cRes, eRes] = await Promise.all([
                classeService.getAll(),
                eleveService.getAll()
            ]);
            setClasses(cRes.classes || []);
            setEleves(eRes.eleves || []);
        } catch (err) {
            setMessage({ text: "Erreur lors du chargement des options.", type: "error" });
        } finally {
            setFetchingOptions(false);
        }
    };

    const handleGenerateBulletin = async (eleveId: string) => {
        setLoading(true);
        setBulletin(null);
        try {
            const res = await bulletinService.getBulletin(eleveId, selectedTerm);
            if (res.status === 'success') {
                setBulletin(res.bulletin);
            } else {
                setMessage({ text: res.message, type: "error" });
            }
        } catch (err: any) {
            setMessage({ text: "Erreur serveur.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const getAppreciation = (avg: string | number) => {
        const n = parseFloat(String(avg));
        if (n >= 18) return "Excellent / Congratulations";
        if (n >= 16) return "Très Bien / Félicitations";
        if (n >= 14) return "Bien / Compliments";
        if (n >= 12) return "Assez Bien / Encouragements";
        if (n >= 10) return "Passable / Doit mieux faire";
        return "Insuffisant / Redoublement d'efforts nécessaire";
    };

    const getDecision = (avg: string | number) => {
        const n = parseFloat(String(avg));
        if (n >= 16) return "Excellent élève";
        if (n >= 15) return "Bon élève";
        if (n > 10) return "Encouragement";
        if (n === 10) return "Élève moyen, nous l'encourageons à travailler davantage";
        return "Élève faible, doit travailler davantage";
    };

    const filteredEleves = selectedClassId
        ? eleves.filter(e => String(e.class_id || (e as any).classId) === String(selectedClassId))
        : [];

    interface SingleBulletinProps {
        data: BulletinData;
    }

    const SingleBulletin = ({ data }: SingleBulletinProps) => {
        const s = data.settings || {};
        // Préfixe BACKEND_URL : les images sont servies par le backend MySQL
        // (port 3001 en dev, autre domaine en prod) et pas par le serveur Vite.
        const logoUrl = resolveAssetUrl(s.logo) || null;
        const stampUrl = resolveAssetUrl(s.stamp) || null;
        const student = data.eleve || {};

        return (
            <div className="bg-white p-6 md:p-12 shadow-none w-full print:p-0 print:m-0 relative overflow-hidden" id="print-area">
                {/* Decorative Background Elements (Visible on Screen, subtle on print) */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none print:hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:40px_40px]"></div>
                </div>

                {/* Main Border Container */}
                <div className="relative border-[6px] border-slate-900 p-2 min-h-[1100px] flex flex-col">
                    <div className="border-2 border-slate-900 p-8 flex-1 flex flex-col">
                        
                        {/* Header Section: State & School Identity */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b-4 border-slate-900">
                            {/* Left: Republic Info */}
                            <div className="flex flex-col items-center text-center space-y-5">
                                <div className="space-y-1">
                                    <h2 className="text-[13px] font-black text-slate-900 uppercase tracking-tighter leading-none">REPUBLIQUE DE DJIBOUTI</h2>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Unité - Égalité - Paix</p>
                                </div>
                                <div className="w-28 h-28 relative group">
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-slate-900/5 blur-xl rounded-full"></div>
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain relative z-10" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center text-[10px] text-slate-300 font-black uppercase tracking-widest leading-none text-center p-4 relative z-10">
                                            Sceau de<br/>L'État
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight max-w-[180px]">
                                        MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE LA FORMATION PROFESSIONNELLE
                                    </h3>
                                </div>
                            </div>

                            {/* Middle: Document Title & Year */}
                            <div className="flex flex-col items-center justify-center text-center space-y-6">
                                <div className="relative">
                                    <div className="absolute -inset-4 bg-slate-900 rotate-1 rounded-xl"></div>
                                    <h1 className="relative text-3xl font-black text-white px-8 py-3 uppercase tracking-[0.2em] leading-none skew-x-[-5deg]">
                                        Bulletin
                                    </h1>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em]">{data.term}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Année Scolaire {data.year}</p>
                                </div>
                                <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest bg-slate-100 px-6 py-2 rounded-full border border-slate-200">
                                    {s.school_name || 'ÉTABLISSEMENT D\'EXCELLENCE'}
                                </p>
                            </div>

                            {/* Right: Student Photo Placeholder area */}
                            <div className="flex flex-col items-center justify-center">
                                <div className="relative w-36 h-44 bg-slate-50 border-4 border-slate-900 rounded-lg flex items-center justify-center overflow-hidden shadow-inner group">
                                    <div className="absolute inset-0 bg-slate-900/5 flex items-center justify-center">
                                        <User size={80} className="text-slate-200" />
                                    </div>
                                    <div className="absolute inset-0 border-[15px] border-white/40"></div>
                                    <div className="absolute bottom-0 inset-x-0 h-10 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                                        <span className="text-[8px] font-black text-white uppercase tracking-[0.3em]">Photo ID</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Student Info Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b-4 border-slate-900 bg-slate-50/50">
                            {[
                                { label: "Nom & Prénom", value: `${student.nom} ${student.prenom}`, wide: true },
                                { label: "Matricule", value: student.matricule },
                                { label: "Classe", value: student.classe_nom },
                                { label: "Date de Naissance", value: student.date_naissance },
                                { label: "Sexe", value: student.genre === 'M' ? 'Masculin' : 'Féminin' },
                                { label: "Niveau", value: student.niveau },
                                { label: "Statut", value: student.redoublant ? 'Redoublant' : 'Passant' }
                            ].map((info, idx) => (
                                <div key={idx} className={`p-5 border-r border-slate-200 last:border-r-0 flex flex-col ${info.wide ? 'md:col-span-2' : ''}`}>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-2">{info.label}</span>
                                    <span className="text-sm font-black text-slate-900 uppercase truncate">{info.value || 'N/A'}</span>
                                </div>
                            ))}
                        </div>

                        {/* Grades Table Section */}
                        <div className="flex-1 mt-10">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em]">
                                        <th className="px-6 py-5 text-left border-r border-white/10">Désignation des Matières</th>
                                        <th className="px-4 py-5 w-28 border-r border-white/10">Moyenne</th>
                                        <th className="px-4 py-5 w-24 border-r border-white/10">Rang</th>
                                        <th className="px-4 py-5 w-24 border-r border-white/10">Max</th>
                                        <th className="px-8 py-5 text-left">Observations de l'Enseignant</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[12px]">
                                    {data.lignes.map((l, i) => (
                                        <tr key={i} className="border-b-2 border-slate-100 group">
                                            <td className="px-6 py-5 border-r-2 border-slate-100">
                                                <div className="font-black text-slate-900 uppercase leading-none mb-1">{l.matiere_nom}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase italic">
                                                    Prof: {l.teacher_nom ? `${l.teacher_nom} ${l.teacher_prenom}` : 'Non Assigné'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 border-r-2 border-slate-100 text-center font-black text-lg text-slate-900">
                                                {parseFloat(String(l.average)) > 0 ? l.average : '-'}
                                            </td>
                                            <td className="px-4 py-5 border-r-2 border-slate-100 text-center font-black text-slate-700">
                                                {parseFloat(String(l.average)) > 0 ? l.rank : '-'}
                                            </td>
                                            <td className="px-4 py-5 border-r-2 border-slate-100 text-center font-bold text-slate-300">
                                                {parseFloat(String(l.average)) > 0 ? l.max_grade : '-'}
                                            </td>
                                            <td className="px-8 py-5 font-bold text-slate-600 italic">
                                                {parseFloat(String(l.average)) > 0 ? getAppreciation(l.average) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    
                                    {/* General Result Row */}
                                    <tr className="bg-slate-900 text-white">
                                        <td className="px-6 py-6 border-r border-white/10 text-right">
                                            <span className="text-[12px] font-black uppercase tracking-[0.4em]">Moyenne Générale</span>
                                        </td>
                                        <td className="px-4 py-6 border-r border-white/10 text-center font-black text-2xl text-primary-light">
                                            {data.moyenne_generale}
                                        </td>
                                        <td className="px-4 py-6 border-r border-white/10 text-center font-black text-xl">
                                            {data.overall_rank}
                                        </td>
                                        <td className="px-4 py-6 border-r border-white/10 text-center text-white/30">
                                            / 20
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary-light shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                                                        style={{ width: `${(parseFloat(String(data.moyenne_generale)) / 20) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                    Performance: {((parseFloat(String(data.moyenne_generale)) / 20) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Section: Decisions & Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 top-1 py-10 border-t-4 border-slate-900 mt-10">
                            {/* Decision Box */}
                            <div className="p-8 border-r-2 border-slate-100 flex flex-col items-center text-center space-y-6">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] border-b-2 border-slate-900 pb-2 mb-4">
                                    Décision du Conseil
                                </h4>
                                <div className="bg-slate-50 w-full p-8 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center min-h-[120px]">
                                    <span className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">
                                        {getDecision(data.moyenne_generale)}
                                    </span>
                                </div>
                            </div>

                            {/* Signature Area */}
                            <div className="p-8 flex flex-col items-center text-center">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] border-b-2 border-slate-900 pb-2 mb-4">
                                    Le Chef d'Établissement
                                </h4>
                                <div className="relative w-48 h-48 flex items-center justify-center mt-2">
                                    {stampUrl ? (
                                        <img src={stampUrl} alt="Tampon" className="w-full h-full object-contain grayscale contrast-125 mix-blend-multiply opacity-90" />
                                    ) : (
                                        <div className="w-full h-full border-4 border-slate-100 border-dotted rounded-full flex flex-col items-center justify-center space-y-2 opacity-30">
                                            <div className="w-32 h-32 border-8 border-slate-200 rounded-full flex items-center justify-center p-4">
                                                <div className="text-[8px] font-black text-slate-400 uppercase leading-tight text-center">SMART SCHOOL<br/>OFFICIAL SEAL</div>
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Cachet & Signature</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Document Footer */}
                        <div className="pt-8 mt-auto flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100">
                             <div className="flex items-center gap-4 text-slate-400">
                                <ShieldCheck size={18} />
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                    Document Authentique - LarIA Engine v2.0
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">
                                Fait à Djibouti le {new Date(data.date_generation).toLocaleDateString('fr-FR')}
                            </p>
                            <div className="px-4 py-1.5 bg-slate-100 rounded text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-200">
                                Matricule: {student.matricule || 'XXXX-XX'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    /**
     * Attend que React ait peint le DOM modifié. Plus fiable et plus rapide
     * qu'un setTimeout arbitraire (500 ms).
     */
    const waitForPaint = () =>
        new Promise<void>(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

    const handleDownloadSinglePdf = async () => {
        const element = bulletinRef.current;
        if (!element || !bulletin) return;
        setPdfExporting(true);
        try {
            // Chargement à la demande des libs PDF (~700 Ko, hors bundle initial).
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                import('jspdf'),
                import('html2canvas'),
            ]);

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const pageHeight = pdf.internal.pageSize.getHeight();
            let heightLeft = pdfHeight;
            let position = 0;
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
            while (heightLeft > 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }
            const nom = bulletin.eleve?.nom || 'eleve';
            const prenom = bulletin.eleve?.prenom || '';
            pdf.save(`Bulletin_${nom}_${prenom}_${bulletin.term?.replace(' ', '')}.pdf`);
            notify.success('Bulletin téléchargé');
        } catch (err: any) {
            console.error('PDF generation error:', err);
            const msg = 'Erreur lors de la génération du PDF.';
            setMessage({ text: msg, type: 'error' });
            notify.error(msg);
        } finally {
            setPdfExporting(false);
        }
    };

    const handleDownloadClassPdf = async () => {
        if (!selectedClassId || filteredEleves.length === 0) return;

        setPdfExporting(true);
        setBatchProgress({ current: 0, total: filteredEleves.length });

        try {
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                import('jspdf'),
                import('html2canvas'),
            ]);

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // PHASE 1 — Pré-fetch en parallèle de TOUS les bulletins (le gros gain).
            // Avant : N × latence_réseau séquentielle.
            // Après : 1 × latence_réseau (toutes les requêtes en parallèle).
            const fetchResults = await Promise.allSettled(
                filteredEleves.map(student =>
                    bulletinService.getBulletin(student.id, selectedTerm)
                )
            );

            // PHASE 2 — Rendu séquentiel (obligatoire : un seul bulletinRef partagé)
            // mais on attend une vraie frame React (~16 ms) au lieu de 500 ms hardcodés.
            let pageIndex = 0;
            for (let i = 0; i < filteredEleves.length; i++) {
                setBatchProgress({ current: i + 1, total: filteredEleves.length });
                const result = fetchResults[i];
                if (result.status !== 'fulfilled' || result.value?.status !== 'success') {
                    console.warn(`Bulletin indisponible pour ${filteredEleves[i].id}`);
                    continue;
                }

                setBulletin(result.value.bulletin);
                await waitForPaint();

                const element = bulletinRef.current;
                if (!element) continue;

                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false
                });
                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                if (pageIndex > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pageIndex++;
            }

            if (pageIndex === 0) {
                throw new Error('Aucun bulletin n\'a pu être généré.');
            }

            const className = classes.find(c => c.id === selectedClassId)?.nom || 'Classe';
            pdf.save(`Bulletins_${className}_${selectedTerm.replace(' ', '')}.pdf`);
            setMessage({ text: 'Tous les bulletins ont été générés.', type: 'success' });
            notify.success(`${pageIndex} bulletin(s) téléchargé(s)`);
        } catch (err: any) {
            console.error('Batch PDF error:', err);
            const msg = err?.message || 'Erreur lors de la génération groupée.';
            setMessage({ text: msg, type: 'error' });
            notify.error(msg);
        } finally {
            setPdfExporting(false);
            setBatchProgress({ current: 0, total: 0 });
        }
    };

    const handleDownloadClassExcel = async () => {
        if (!selectedClassId || filteredEleves.length === 0) return;
        setLoading(true);
        try {
            const classeNom = classes.find(c => c.id === selectedClassId)?.nom || selectedClassId;

            // xlsx pèse ~350 Ko — chargement à la demande uniquement.
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();

            // Feuille 1 : Liste des élèves
            const elevesData = filteredEleves.map((e: any, idx: number) => ({
                'N°': idx + 1,
                'Matricule': e.matricule || '',
                'Nom': e.nom || '',
                'Prénom': e.prenom || '',
                'Genre': e.genre === 'F' ? 'Féminin' : 'Masculin',
                'Classe': e.classe_nom || classeNom,
                'Statut': e.redoublant ? 'Redoublant' : 'Passant'
            }));
            const wsEleves = XLSX.utils.json_to_sheet(elevesData);
            wsEleves['!cols'] = [{ wch: 4 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsEleves, 'Élèves');

            // Feuille 2 — pré-fetch parallèle des bulletins (gros gain ici aussi).
            setBatchProgress({ current: 0, total: filteredEleves.length });
            const fetchResults = await Promise.allSettled(
                filteredEleves.map(e => bulletinService.getBulletin(e.id, selectedTerm))
            );

            const allNotesData: any[] = [];
            filteredEleves.forEach((e: any, i: number) => {
                setBatchProgress({ current: i + 1, total: filteredEleves.length });
                const result = fetchResults[i];
                if (result.status === 'fulfilled' && result.value?.status === 'success') {
                    const b = result.value.bulletin;
                    const row: any = {
                        'Nom': b.eleve?.nom || '',
                        'Prénom': b.eleve?.prenom || '',
                        'Matricule': b.eleve?.matricule || '',
                        'Moyenne Générale': b.moyenne_generale,
                        'Rang': b.overall_rank
                    };
                    b.lignes.forEach((l: any) => { row[l.matiere_nom] = l.average; });
                    allNotesData.push(row);
                } else {
                    allNotesData.push({ 'Nom': e.nom, 'Prénom': e.prenom, 'Matricule': e.matricule, 'Erreur': 'Données manquantes' });
                }
            });

            const wsAllNotes = XLSX.utils.json_to_sheet(allNotesData);
            XLSX.utils.book_append_sheet(wb, wsAllNotes, 'Notes Détaillées');

            XLSX.writeFile(wb, `Récapitulatif_Notes_${classeNom}_${selectedTerm.replace(' ', '_')}.xlsx`);
            setMessage({ text: `Export Excel complet généré pour ${classeNom} !`, type: 'success' });
            notify.success('Export Excel généré');
        } catch (err: any) {
            console.error('Excel export error:', err);
            const msg = 'Erreur lors de la génération du fichier Excel.';
            setMessage({ text: msg, type: 'error' });
            notify.error(msg);
        } finally {
            setLoading(false);
            setBatchProgress({ current: 0, total: 0 });
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12 print:p-0">
            {/* Control Panel (Hidden during print) */}
            <div className="print:hidden space-y-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-slate-900 via-slate-800 to-primary rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] relative overflow-hidden group">
                             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <Award size={36} className="relative z-10" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-2">
                                Bulletins <span className="text-primary tracking-tight">Académiques</span>
                            </h1>
                            <div className="flex items-center gap-3">
                                <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                    High-Fidelity Edition
                                </span>
                                <span className="flex items-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                                    <ShieldCheck size={14} className="mr-2 text-emerald-500" />
                                    Certification Djibouti
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {selectedClassId && (
                            <>
                                <button
                                    onClick={handleDownloadClassExcel}
                                    disabled={loading}
                                    className="premium-card bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-8 py-5 rounded-[2rem] shadow-xl shadow-emerald-500/20 font-black flex items-center transition-all hover:scale-105 active:scale-95 group text-sm border-0"
                                >
                                    {loading ? <Loader2 className="mr-3 animate-spin" size={20} /> : <FileSpreadsheet className="mr-3 group-hover:-translate-y-1 transition-transform" size={20} />}
                                    EXPORTER EXCEL
                                </button>
                                <button
                                    onClick={handleDownloadClassPdf}
                                    disabled={pdfExporting || loading}
                                    className="premium-card bg-slate-900 hover:bg-primary text-white px-8 py-5 rounded-[2rem] shadow-xl shadow-slate-900/20 font-black flex items-center transition-all hover:scale-105 active:scale-95 group text-sm border-0"
                                >
                                    {pdfExporting ? (
                                        <>
                                            <Loader2 className="mr-3 animate-spin" size={20} />
                                            {batchProgress.current}/{batchProgress.total}
                                        </>
                                    ) : (
                                        <>
                                            <FileDown className="mr-3 group-hover:rotate-12 transition-transform" size={20} />
                                            TOUS LES PDF
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {/* Control Card: Selection */}
                    <div className="premium-card glass p-10 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white/40 backdrop-blur-xl border-0 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-5 mb-10">
                                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <GraduationCap size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Paramètres d'Édition</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configuration de la classe et de la période</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Classe Cible</label>
                                    <div className="relative">
                                        <select
                                            value={selectedClassId}
                                            onChange={(e) => { setSelectedClassId(e.target.value); setBulletin(null); }}
                                            className="w-full px-8 py-5 bg-white/60 border-2 border-transparent focus:border-primary/20 rounded-[2rem] outline-none font-black text-slate-700 transition-all cursor-pointer appearance-none shadow-sm text-lg"
                                        >
                                            <option value="">Sélectionner...</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={20} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Période Scolaire</label>
                                    <div className="relative">
                                        <select
                                            value={selectedTerm}
                                            onChange={(e) => { setSelectedTerm(e.target.value); setBulletin(null); }}
                                            className="w-full px-8 py-5 bg-white/60 border-2 border-transparent focus:border-primary/20 rounded-[2rem] outline-none font-black text-slate-700 transition-all cursor-pointer appearance-none shadow-sm text-lg"
                                        >
                                            <option value="Trimestre 1">1er Trimestre</option>
                                            <option value="Trimestre 2">2ème Trimestre</option>
                                            <option value="Trimestre 3">3ème Trimestre</option>
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Control Card: Students Grid */}
                    <div className="premium-card glass p-10 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-slate-900 border-0 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
                        <div className="absolute top-0 right-0 w-80 h-80 bg-primary rounded-full blur-[100px] opacity-20 -mr-40 -mt-40"></div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                                        <UserCircle2 size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">Registre des Élèves</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sélectionnez pour générer</p>
                                    </div>
                                </div>
                                {selectedClassId && (
                                    <span className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black text-white/50 uppercase tracking-widest">
                                        {filteredEleves.length} Total
                                    </span>
                                )}
                            </div>

                            {selectedClassId ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[220px] overflow-y-auto pr-4 custom-scrollbar">
                                    {filteredEleves.map((e, idx) => (
                                        <motion.button
                                            key={e.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.02 }}
                                            onClick={() => handleGenerateBulletin(e.id)}
                                            className={`group/btn p-5 rounded-[1.5rem] font-black text-left transition-all flex items-center gap-4 relative overflow-hidden ${
                                                bulletin?.eleve?.id === e.id
                                                ? 'bg-primary text-white shadow-xl shadow-primary/30 ring-4 ring-primary/20 scale-105'
                                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-colors ${
                                                bulletin?.eleve?.id === e.id ? 'bg-white/20' : 'bg-slate-800'
                                            }`}>
                                                {e.nom?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="truncate text-[11px] uppercase tracking-tighter leading-none mb-1">
                                                    {e.nom || 'Inconnu'}
                                                </span>
                                                <span className={`text-[8px] font-bold uppercase transition-colors ${
                                                    bulletin?.eleve?.id === e.id ? 'text-white/60' : 'text-slate-600'
                                                }`}>
                                                    {e.matricule || 'N/A'}
                                                </span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30">
                                    <div className="w-20 h-20 border-4 border-dashed border-white/20 rounded-full flex items-center justify-center mb-6">
                                        <Search size={32} className="text-white" />
                                    </div>
                                    <p className="text-sm font-black text-white uppercase tracking-[0.3em] text-center max-w-[200px]">
                                        En attente de sélection de classe
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Preview / Output Area */}
            <div className="relative">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="py-48 text-center bg-white/40 backdrop-blur-xl rounded-[4rem] shadow-2xl border-0 overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="relative w-40 h-40 mb-12">
                                    <div className="absolute inset-0 border-8 border-primary/10 rounded-full"></div>
                                    <div className="absolute inset-0 border-8 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <GraduationCap size={64} className="text-primary animate-pulse" />
                                    </div>
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-[0.5em] leading-none mb-4">Traitement IA</h2>
                                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest animate-pulse">Calcul des moyennes & consolidation des rangs...</p>
                                
                                <div className="mt-12 w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                        className="w-1/2 h-full bg-primary shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ) : bulletin ? (
                        <div className="fixed inset-0 z-[100] bg-slate-100/95 backdrop-blur-md overflow-y-auto custom-scrollbar">
                            <div className="min-h-full px-4 md:px-8 py-6 flex flex-col items-center">
                                {/* Modal Controls Header */}
                                <div className="sticky top-4 z-[120] w-full max-w-6xl flex items-center justify-between print:hidden mb-6 bg-white p-4 rounded-2xl shadow-lg border border-slate-200">
                                    <div className="flex items-center gap-4 pl-2">
                                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
                                            <FileText size={18} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Aperçu du bulletin</span>
                                            <h3 className="text-sm md:text-base font-bold text-slate-800 tracking-tight truncate">
                                                {bulletin.eleve?.nom} {bulletin.eleve?.prenom}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <button
                                            onClick={handleDownloadSinglePdf}
                                            disabled={pdfExporting}
                                            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 md:px-6 py-2.5 rounded-xl font-semibold flex items-center transition-all text-sm shadow-md"
                                        >
                                            {pdfExporting
                                                ? <Loader2 className="mr-2 animate-spin" size={16} />
                                                : <Download className="mr-2" size={16} />}
                                            <span className="hidden sm:inline">{pdfExporting ? 'Génération…' : 'Télécharger PDF'}</span>
                                            <span className="sm:hidden">PDF</span>
                                        </button>
                                        <button
                                            onClick={() => setBulletin(null)}
                                            aria-label="Fermer l'aperçu"
                                            className="w-10 h-10 bg-slate-200 hover:bg-red-500 text-slate-600 hover:text-white rounded-xl flex items-center justify-center transition-all"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                <motion.div
                                    key="bulletin"
                                    initial={{ opacity: 0, scale: 0.97, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ type: "spring", damping: 25, stiffness: 100 }}
                                    className="relative w-full max-w-6xl mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white"
                                >
                                    <div ref={bulletinRef} className="bg-white">
                                        <SingleBulletin data={bulletin} />
                                    </div>
                                </motion.div>

                                <div className="py-8 text-center">
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">
                                        Smart School AI Engine v2.0
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : !selectedClassId && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-48 text-center bg-white/30 backdrop-blur-md rounded-[5rem] border-4 border-dashed border-slate-200 flex flex-col items-center group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent"></div>
                            <div className="relative z-10">
                                <div className="w-36 h-36 bg-white rounded-[4rem] shadow-2xl flex items-center justify-center text-slate-200 mb-12 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                                    <Award size={80} />
                                </div>
                                <h3 className="text-4xl font-black text-slate-300 uppercase tracking-[0.4em] italic leading-none mb-6 mb-4">
                                    Centre de <span className="text-primary/20">Bulletins</span>
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[300px] mx-auto opacity-60">
                                    Sélectionnez une classe pour commencer l'édition des relevés de notes officiels
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Hidden Container for Batch Generation (Off-screen) */}
            <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', width: '210mm' }}>
                <div ref={batchRef} className="bg-white">
                    {/* Rendered only during batch */}
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: A4; margin: 1cm; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; color: black; }
                    .print\\:hidden { display: none !important; }
                    #print-area { 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        width: 100% !important; 
                        max-width: none !important; 
                        transform: none !important;
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    nav, .sidebar, .navbar, .header-dashboard { display: none !important; }
                    .bg-gray-900 { background-color: #000 !important; }
                    .text-primary { color: #000 !important; }
                    .border-gray-900 { border-color: #000 !important; }
                    .divide-gray-900 { border-color: #000 !important; }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default Bulletins;
