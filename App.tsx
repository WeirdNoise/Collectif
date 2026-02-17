import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Edit3, Image as ImageIcon, Download, Check, ChevronRight, UploadCloud, Wand2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import { CandidateProfile, Step } from './types';
import { CardTemplate } from './components/CardTemplate';
import { analyzeAndNormalizeImage } from './services/imageProcessing';
import { restorePhotoWithAI } from './services/geminiService';

const INITIAL_PROFILE: CandidateProfile = {
  firstName: '',
  lastName: '',
  photoUrl: null,
  photoFilter: '',
  bioTitle: 'Qui suis-je ?',
  bio: '',
  goalsTitle: 'Mes envies pour la commune',
  goals: '',
  commissionsTitle: 'Les commissions',
  commissions: ''
};

// Increased character limits
const MAX_CHARS = {
  bio: 350,
  goals: 350,
  commissions: 250
};

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.COLLECT);
  const [data, setData] = useState<CandidateProfile>(INITIAL_PROFILE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Refs for generating images (attached to off-screen elements)
  const refA4 = useRef<HTMLDivElement>(null);
  const refStory = useRef<HTMLDivElement>(null);
  const refSquare = useRef<HTMLDivElement>(null);

  // Inject fonts manually to allow html-to-image to capture them consistently.
  useEffect(() => {
    const fontUrl = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:ital,wght@0,400;0,600;1,400&family=Yeseva+One&display=swap';
    
    if (document.querySelector(`style[data-font-url="${fontUrl}"]`)) return;

    fetch(fontUrl)
      .then(res => res.text())
      .then(css => {
        const style = document.createElement('style');
        style.setAttribute('data-font-url', fontUrl);
        style.textContent = css;
        document.head.appendChild(style);
      })
      .catch(e => console.error("Error loading fonts", e));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const processFile = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      
      // Start loading/analysis state
      setIsAnalyzing(true);
      
      // Default state with no filter while analyzing
      setData(prev => ({ ...prev, photoUrl: url, photoFilter: '' }));

      try {
        // Automatically calculate optimal filters for consistency
        const autoFilter = await analyzeAndNormalizeImage(url);
        setData(prev => ({ ...prev, photoFilter: autoFilter }));
      } catch (e) {
        console.error("Auto-enhance failed", e);
      } finally {
        setIsAnalyzing(false);
      }

    } else {
      alert("Format de fichier non supporté. Veuillez utiliser une image (JPEG, PNG).");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const toggleEnhancement = () => {
    // If we have a filter, remove it. If we don't, re-analyze (or just apply a generic boost if URL exists)
    if (data.photoFilter) {
      setData(prev => ({ ...prev, photoFilter: '' }));
    } else if (data.photoUrl) {
      setIsAnalyzing(true);
      analyzeAndNormalizeImage(data.photoUrl).then(filter => {
        setData(prev => ({ ...prev, photoFilter: filter || 'brightness(1.1) contrast(1.1)' }));
        setIsAnalyzing(false);
      });
    }
  };

  const handleAiRestore = async () => {
    if (!data.photoUrl || isRestoring) return;
    
    setIsRestoring(true);
    try {
      // 1. Fetch the blob from the current object URL
      const response = await fetch(data.photoUrl);
      const blob = await response.blob();
      
      // 2. Convert to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // Extract pure base64 part (remove "data:image/xyz;base64,")
        const base64Content = base64data.split(',')[1];
        const mimeType = base64data.split(';')[0].split(':')[1];

        try {
          // 3. Call AI Service
          const newImageUrl = await restorePhotoWithAI(base64Content, mimeType);
          
          // 4. Update State with new image and reset filters (since the new image is already perfect)
          setData(prev => ({ ...prev, photoUrl: newImageUrl, photoFilter: '' }));
        } catch (error) {
          alert("Erreur lors de la restauration IA. Vérifiez votre clé API ou réessayez.");
        } finally {
          setIsRestoring(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      setIsRestoring(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const downloadImage = useCallback(async (format: 'a4' | 'story' | 'square') => {
    if (isGenerating) return;
    setIsGenerating(true);

    let ref = refA4;
    let destination = 'Impression';

    if (format === 'story') {
      ref = refStory;
      destination = 'Facebook';
    }
    if (format === 'square') {
      ref = refSquare;
      destination = 'Instagram';
    }

    if (ref.current) {
      try {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 100));

        const dataUrl = await toPng(ref.current, { 
          cacheBust: false, 
          pixelRatio: 2, 
          skipAutoScale: true,
          backgroundColor: '#ffffff',
          filter: (node) => {
             if (node instanceof HTMLElement && node.tagName === 'LINK' && (node as HTMLLinkElement).rel === 'stylesheet') {
               const href = (node as HTMLLinkElement).href;
               if (href && href.includes('fonts.googleapis.com')) {
                 return false;
               }
             }
             return true;
          }
        });
        
        const link = document.createElement('a');
        const safeLastName = (data.lastName || 'Nom').trim().replace(/[^a-zA-Z0-9àâäéèêëîïôöùûüçñÀÂÄÉÈÊËÎÏÔÖÙÛÜÇÑ]/g, '_');
        const safeFirstName = (data.firstName || 'Prenom').trim().replace(/[^a-zA-Z0-9àâäéèêëîïôöùûüçñÀÂÄÉÈÊËÎÏÔÖÙÛÜÇÑ]/g, '_');
        
        link.download = `${safeLastName}-${safeFirstName}-${destination}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to generate image', err);
        alert('Erreur lors de la création de l\'image. Veuillez réessayer.');
      } finally {
        setIsGenerating(false);
      }
    } else {
      setIsGenerating(false);
    }
  }, [data, isGenerating]);

  const steps = [
    { id: Step.COLLECT, label: 'Édition', icon: <Edit3 className="w-5 h-5" /> },
    { id: Step.GENERATE, label: 'Export', icon: <Download className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-950 text-slate-100">
      
      {/* Off-screen container for high-quality generation */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        <CardTemplate ref={refA4} data={data} format="a4" />
        <CardTemplate ref={refStory} data={data} format="story" />
        <CardTemplate ref={refSquare} data={data} format="square" />
      </div>

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-domessin-primary rounded-md flex items-center justify-center text-white font-bold font-display shadow-lg shadow-teal-900/50">A</div>
            <h1 className="text-lg font-bold text-slate-100 hidden sm:block">Fiche individuelle</h1>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${currentStep === step.id ? 'bg-domessin-primary text-white shadow-lg shadow-teal-900/50' : 
                      currentStep > step.id ? 'text-green-400 bg-green-900/20' : 'text-slate-600'}
                  `}
                >
                  {step.icon}
                  <span className="hidden md:inline">{step.label}</span>
                </button>
                {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-700 mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        
        {/* Step 1: Collect */}
        {currentStep === Step.COLLECT && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
              <h2 className="text-2xl font-display font-bold text-domessin-secondary mb-6 border-b border-slate-800 pb-2">Informations Candidat</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Prénom</label>
                  <input
                    type="text"
                    name="firstName"
                    value={data.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-domessin-primary focus:border-transparent outline-none text-white placeholder-slate-500"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Nom</label>
                  <input
                    type="text"
                    name="lastName"
                    value={data.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-domessin-primary focus:border-transparent outline-none text-white placeholder-slate-500"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-400 mb-2">Photo du candidat</label>
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    relative w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group
                    ${isDragging ? 'border-domessin-primary bg-domessin-primary/10' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'}
                  `}
                >
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {data.photoUrl ? (
                    <div className="relative flex flex-col items-center z-10 pointer-events-none">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-600 shadow-xl mx-auto mb-4 bg-slate-200">
                        {/* Preview with custom Object Position for better face centering */}
                        <img 
                          src={data.photoUrl} 
                          alt="Preview" 
                          style={{ 
                            filter: data.photoFilter,
                            objectPosition: '50% 20%' // Consistent framing for portraits
                          }}
                          className={`w-full h-full object-cover transition-all duration-300`} 
                        />
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-green-400 font-semibold flex items-center justify-center">
                           <Check className="w-4 h-4 mr-1"/> Photo chargée
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Glissez une autre image pour remplacer</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500 group-hover:text-slate-400 transition-colors">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                         <UploadCloud className="w-8 h-8" />
                      </div>
                      <p className="font-semibold text-center">
                        Glissez votre photo ici <br/>
                        <span className="text-xs font-normal opacity-70">ou cliquez pour parcourir</span>
                      </p>
                      <p className="text-xs mt-2 text-slate-600">JPG, PNG, WEBP</p>
                    </div>
                  )}
                </div>

                {/* Enhancement Controls */}
                {data.photoUrl && (
                  <div className="flex flex-col sm:flex-row justify-center mt-4 gap-3">
                    {/* Basic Optimization (CSS) */}
                    <button
                      onClick={toggleEnhancement}
                      disabled={isAnalyzing || isRestoring}
                      className={`
                        flex items-center justify-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${data.photoFilter 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 ring-2 ring-indigo-400' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
                      `}
                    >
                      {isAnalyzing ? (
                         <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                         <Wand2 className={`w-4 h-4 ${data.photoFilter ? 'text-yellow-300 fill-yellow-300' : ''}`} />
                      )}
                      <span>
                        {isAnalyzing ? 'Analyse...' : (data.photoFilter ? 'Optimisation active' : 'Filtre Auto (CSS)')}
                      </span>
                    </button>

                    {/* AI Restoration (Gemini) */}
                    <button
                      onClick={handleAiRestore}
                      disabled={isRestoring || isAnalyzing}
                      className={`
                        flex items-center justify-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all border border-indigo-500/30
                        bg-gradient-to-r from-purple-900/50 to-indigo-900/50 text-indigo-200 hover:text-white hover:from-purple-800 hover:to-indigo-800
                      `}
                    >
                      {isRestoring ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      )}
                      <span>
                        {isRestoring ? 'Restauration en cours...' : 'Restauration IA (Studio)'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 space-y-6">
              
              {/* Sections */}
              {[
                { key: 'bio', label: 'Section 1', titleKey: 'bioTitle', titlePlaceholder: 'Qui suis-je ?', placeholder: 'Parcours, profession...', limit: MAX_CHARS.bio },
                { key: 'goals', label: 'Section 2', titleKey: 'goalsTitle', titlePlaceholder: 'Mes envies', placeholder: 'Projets prioritaires...', limit: MAX_CHARS.goals },
                { key: 'commissions', label: 'Section 3', titleKey: 'commissionsTitle', titlePlaceholder: 'Les commissions', placeholder: 'Urbanisme...', limit: MAX_CHARS.commissions },
              ].map((section) => (
                <div key={section.key} className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50">
                  <div className="mb-2">
                     <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">{section.label}</label>
                     <input
                      type="text"
                      name={section.titleKey}
                      value={(data as any)[section.titleKey]}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-700 bg-slate-800 rounded-md focus:ring-1 focus:ring-domessin-primary outline-none font-bold text-domessin-secondary text-lg placeholder-slate-600"
                      placeholder={section.titlePlaceholder}
                     />
                  </div>
                  <div className="relative">
                    <textarea
                      name={section.key}
                      value={(data as any)[section.key]}
                      onChange={handleInputChange}
                      maxLength={section.limit}
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-700 bg-slate-800 rounded-lg focus:ring-2 focus:ring-domessin-primary outline-none text-white placeholder-slate-500"
                      placeholder={section.placeholder}
                    />
                    <div className={`text-right text-xs mt-1 ${(data as any)[section.key].length >= section.limit ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                      {(data as any)[section.key].length}/{section.limit}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setCurrentStep(Step.GENERATE)}
              className="w-full py-4 bg-domessin-primary text-white rounded-xl font-bold text-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-900/50 flex items-center justify-center space-x-2"
            >
              <span>Générer les visuels</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Generate & Download */}
        {currentStep === Step.GENERATE && (
          <div className="animate-fade-in space-y-8 pb-20">
             <div className="bg-green-900/30 border-l-4 border-green-500 p-4 rounded-r-lg flex justify-between items-center">
                <div>
                  <h3 className="text-green-400 font-bold">Visuels générés !</h3>
                  <p className="text-green-300/80 text-sm">Cliquez sur les boutons pour télécharger les formats.</p>
                </div>
                <button onClick={() => setCurrentStep(Step.COLLECT)} className="text-green-400 underline text-sm hover:text-green-300">
                  <span className="flex items-center"><Edit3 className="w-3 h-3 mr-1"/> Modifier</span>
                </button>
             </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[
                { id: 'a4', label: 'Format A4 (Flyer)', w: 265, h: 374, scale: 0.333 },
                { id: 'story', label: 'Story (9:16)', w: 270, h: 480, scale: 0.25 },
                { id: 'square', label: 'Post (1:1)', w: 300, h: 300, scale: 0.277 }
              ].map((fmt) => (
                <div key={fmt.id} className="flex flex-col items-center">
                   <h4 className="font-bold text-slate-300 mb-3 flex items-center"><ImageIcon className="w-4 h-4 mr-2"/> {fmt.label}</h4>
                   <div className={`relative border border-slate-700 shadow-2xl overflow-hidden bg-white`} style={{ width: fmt.w, height: fmt.h }}>
                      <div className="origin-top-left" style={{ transform: `scale(${fmt.scale})` }}>
                         <CardTemplate data={data} format={fmt.id as any} />
                      </div>
                   </div>
                   <button 
                      onClick={() => downloadImage(fmt.id as any)} 
                      disabled={isGenerating}
                      className="mt-4 w-full py-2 bg-slate-800 text-white rounded-lg flex items-center justify-center hover:bg-slate-700 border border-slate-700 disabled:opacity-50"
                   >
                      {isGenerating ? 'Génération...' : <><Download className="w-4 h-4 mr-2" /> Télécharger</>}
                   </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}