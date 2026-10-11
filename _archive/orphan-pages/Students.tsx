import React from 'react';
import { Users, UserPlus, Search, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_STUDENTS = [
  { id: '1', name: 'Jean Dupont', class: '6ème A', lastGrade: '15/20' },
  { id: '2', name: 'Marie Curie', class: '6ème A', lastGrade: '19/20' },
  { id: '3', name: 'Albert Einstein', class: '5ème B', lastGrade: '18/20' },
];

export const Students = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="animate-fade"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Gestion des Élèves</h2>
          <p style={{ color: '#64748b' }}>Consultez et gérez la base de données de vos élèves.</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <UserPlus size={18} />
          Nouvel Élève
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <Search size={18} className="input-icon" />
            <input type="text" placeholder="Rechercher un élève..." style={{ background: 'rgba(255,255,255,0.03)' }} />
          </div>
          <select style={{ 
            background: 'rgba(15, 23, 42, 0.6)', 
            border: '1px solid rgba(255,255,255,0.08)', 
            borderRadius: '12px', 
            color: 'white', 
            padding: '0 1rem' 
          }}>
            <option>Toutes les classes</option>
            <option>6ème A</option>
            <option>5ème B</option>
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1.2rem 1.5rem' }}>Nom de l'élève</th>
              <th style={{ padding: '1.2rem 1.5rem' }}>Classe</th>
              <th style={{ padding: '1.2rem 1.5rem' }}>Dernière Note</th>
              <th style={{ padding: '1.2rem 1.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_STUDENTS.map((student) => (
              <tr key={student.id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)', color: '#e2e8f0' }}>
                <td style={{ padding: '1.2rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                      <Users size={16} color="#818cf8" />
                    </div>
                    {student.name}
                  </div>
                </td>
                <td style={{ padding: '1.2rem 1.5rem' }}>
                  <span style={{ padding: '0.3rem 0.8rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '20px', fontSize: '0.8rem' }}>
                    {student.class}
                  </span>
                </td>
                <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600' }}>{student.lastGrade}</td>
                <td style={{ padding: '1.2rem 1.5rem' }}>
                  <button style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}>
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
