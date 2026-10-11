import { useState, useRef } from 'react';

interface Props {
  onUpload: (base64: string) => void;
  isLoading: boolean;
}

export const FileUploader = ({ onUpload, isLoading }: Props) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onUpload(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="glass-card" 
      style={{ padding: '2rem', border: '2px dashed rgba(255,255,255,0.1)', cursor: 'pointer' }}
      onClick={() => !isLoading && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        hidden 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
      />
      
      {preview ? (
        <div style={{ position: 'relative' }}>
          <img 
            src={preview} 
            alt="Aperçu" 
            style={{ maxWidth: '100%', borderRadius: '12px', opacity: isLoading ? 0.3 : 1 }} 
          />
          {isLoading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className="spinner"></div>
              <p style={{ fontWeight: 600, color: '#60a5fa' }}>Analyse par LARIA...</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8' }}>
            {isLoading ? 'Analyse en cours...' : 'Prendre une photo ou sélectionner un bulletin'}
          </p>
          <button disabled={isLoading}>Choisir un fichier</button>
        </div>
      )}
    </div>
  );
};
