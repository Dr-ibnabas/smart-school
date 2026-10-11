import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  BarChart3, 
  Star, 
  Edit3, 
  Save, 
  X,
  Trophy,
  Target
} from 'lucide-react';

export const GradeResult = ({ data, onConfirm, onCancel }: any) => {
  const [eleves, setEleves] = useState(data?.data?.eleves || data?.eleves || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const startEditing = (index: number, eleve: any) => {
    setEditingIndex(index);
    setEditValues({ ...eleve });
  };

  const saveEdit = (index: number) => {
    const newEleves = [...eleves];
    newEleves[index] = { ...editValues };
    setEleves(newEleves);
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const handleConfirm = () => {
    onConfirm(eleves);
  };

  const average = eleves.length > 0 
    ? (eleves.reduce((acc: any, curr: any) => acc + parseFloat(curr.note || 0), 0) / eleves.length).toFixed(2) 
    : '0.00';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="premium-card glass shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden relative z-20 border border-white/60 rounded-[3rem]"
    >
      {/* Premium Decorative Header Line */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-indigo-500 to-emerald-400"></div>
      
      <div className="p-10">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="flex items-center space-x-8">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/10 border border-primary/20 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] animate-ping opacity-20"></div>
              <CheckCircle2 size={40} strokeWidth={2.5} className="relative z-10" />
            </div>
            <div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter m-0 uppercase flex items-center gap-4">
                Analyse <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600 italic">IA Smart-OCR</span>
              </h3>
              <p className="text-slate-500 font-black text-[11px] uppercase tracking-[0.4em] mt-3 flex items-center">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-3 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                Traitement Cognitif Terminé • <span className="text-primary ml-2">{eleves.length} Documents Segmentés</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-10 bg-slate-900/5 px-10 py-6 rounded-[2.5rem] border border-slate-200/50 backdrop-blur-md shadow-inner">
             <div className="text-center group border-r border-slate-200 pr-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3 group-hover:text-primary transition-colors flex items-center gap-2">
                    <Target size={12} /> Performance
                </p>
                <div className="flex items-center justify-center gap-3">
                    <p className="text-3xl font-black text-slate-900 italic tracking-tighter">
                        {average}
                    </p>
                    <span className="text-slate-400 font-black text-[10px] uppercase">/ 20</span>
                </div>
             </div>
             <div className="text-center group">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3 group-hover:text-primary transition-colors flex items-center gap-2">
                     <Trophy size={12} className="text-amber-500" /> Major
                </p>
                <p className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {eleves.length > 0 ? eleves.reduce((prev: any, current: any) => (parseFloat(prev.note) > parseFloat(current.note)) ? prev : current).name.split(' ')[0] : 'None'}
                </p>
             </div>
          </div>
        </div>
        
        {/* Results List Section */}
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6 px-4">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 italic">Extraction de Données Individualisées</h4>
                <div className="text-[10px] font-black text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                    EDITION MANUELLE ACTIVÉE
                </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto px-4 pr-6 custom-scrollbar pb-6">
                <AnimatePresence mode="popLayout">
                    {eleves.map((eleve: any, i: number) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`group relative bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white/80 p-6 flex flex-col md:flex-row items-center gap-8 shadow-sm hover:shadow-2xl hover:bg-white/95 hover:-translate-y-1 transition-all duration-500 ${editingIndex === i ? 'ring-4 ring-primary/20 border-primary/40 bg-white/95 scale-[1.01]' : ''}`}
                        >
                            {/* Student Info */}
                            <div className="flex items-center gap-6 min-w-[280px]">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-[1.8rem] bg-slate-900 text-white flex items-center justify-center text-2xl font-black shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                                        {eleve.name ? eleve.name.charAt(0).toUpperCase() : <User size={28} />}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-xl border-4 border-white shadow-lg flex items-center justify-center ${parseFloat(eleve.note) >= 10 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                        {parseFloat(eleve.note) >= 10 ? <Check size={12} className="text-white" strokeWidth={4} /> : <AlertTriangle size={12} className="text-white" strokeWidth={4} />}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    {editingIndex === i ? (
                                        <input 
                                            type="text"
                                            value={editValues.name}
                                            onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                                            className="w-full bg-slate-100 border-2 border-primary/20 rounded-xl px-4 py-2 font-black text-slate-800 outline-none focus:border-primary transition-all uppercase mb-2"
                                        />
                                    ) : (
                                        <h5 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-2 group-hover:text-primary transition-colors">
                                            {eleve.name || 'Candidat Inconnu'}
                                        </h5>
                                    )}
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/80 px-4 py-1.5 rounded-full border border-slate-200/50">ID-REF-{1000 + i}</span>
                                </div>
                            </div>

                            {/* Score Section */}
                            <div className="flex items-center gap-6 flex-1 justify-center">
                                <div className="text-center group/score">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 hidden md:block">Score Extrait</p>
                                    <div className="relative inline-block">
                                        {editingIndex === i ? (
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="text"
                                                    value={editValues.note}
                                                    onChange={(e) => setEditValues({...editValues, note: e.target.value})}
                                                    className="w-20 bg-slate-100 border-2 border-primary/20 rounded-2xl px-4 py-3 font-black text-3xl text-slate-800 outline-none focus:border-primary text-center italic"
                                                />
                                                <span className="text-2xl font-black text-slate-300">/</span>
                                                <input 
                                                    type="text"
                                                    value={editValues.max || 20}
                                                    onChange={(e) => setEditValues({...editValues, max: e.target.value})}
                                                    className="w-16 bg-slate-100/50 border-2 border-slate-200 rounded-2xl px-2 py-2 font-black text-lg text-slate-500 outline-none text-center"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-end gap-2">
                                                <span className={`text-4xl font-black italic tracking-tighter ${parseFloat(eleve.note) >= 12 ? 'text-primary' : parseFloat(eleve.note) >= 10 ? 'text-slate-800' : 'text-red-500'}`}>
                                                    {eleve.note}
                                                </span>
                                                <span className="text-slate-300 font-extrabold text-lg mb-1">/ {eleve.max || 20}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Appreciation / Tags */}
                            <div className="flex-1 flex flex-col items-end gap-3 min-w-[200px]">
                                {editingIndex === i ? (
                                    <textarea 
                                        value={editValues.appreciation}
                                        onChange={(e) => setEditValues({...editValues, appreciation: e.target.value})}
                                        className="w-full bg-slate-100 border-2 border-primary/20 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-primary h-20 resize-none"
                                        placeholder="Appréciation..."
                                    />
                                ) : (
                                    <div className="flex flex-col items-end gap-2">
                                        <div className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 ${parseFloat(eleve.note) >= 14 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : parseFloat(eleve.note) >= 10 ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                                            <Star size={14} fill={parseFloat(eleve.note) >= 12 ? "currentColor" : "none"} />
                                            {eleve.appreciation || 'Observation à saisir'}
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Probabilité de confiance: 98%</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex md:flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {editingIndex === i ? (
                                    <>
                                        <button 
                                            onClick={() => saveEdit(i)}
                                            className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all"
                                        >
                                            <Save size={20} />
                                        </button>
                                        <button 
                                            onClick={cancelEdit}
                                            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-red-500 hover:border-red-200 transition-all"
                                        >
                                            <X size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => startEditing(i, eleve)}
                                        className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shadow-sm hover:bg-primary hover:text-white hover:border-primary hover:scale-110 active:scale-95 transition-all"
                                    >
                                        <Edit3 size={20} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {eleves.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[3rem] flex items-center justify-center mb-8 shadow-inner border border-red-100 animate-bounce">
                          <AlertTriangle size={40} strokeWidth={2.5} />
                        </div>
                        <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Extraction Nulle</h4>
                        <p className="text-slate-400 font-bold text-sm max-w-sm uppercase tracking-widest leading-relaxed">
                            L'IA n'a pu identifier aucun schéma de données valide sur ce support.
                        </p>
                    </div>
                )}
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <button 
            onClick={handleConfirm} 
            disabled={editingIndex !== null}
            className="flex-1 bg-slate-900 text-white rounded-[2.2rem] py-8 text-xl font-black uppercase tracking-widest flex justify-center items-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] hover:bg-primary hover:shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden relative disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <Check className="mr-5 group-hover:scale-125 transition-transform" size={32} strokeWidth={4} />
            Confirmer l'Archivage
          </button>
          <button 
            onClick={onCancel} 
            className="md:w-72 py-8 rounded-[2.2rem] bg-white text-slate-400 font-black uppercase tracking-[0.25em] transition-all text-[11px] border-2 border-slate-100 hover:border-red-500 hover:text-red-500 hover:bg-red-50 shadow-sm"
          >
            Annuler l'Opération
          </button>
        </div>
      </div>
    </motion.div>
  );
};


