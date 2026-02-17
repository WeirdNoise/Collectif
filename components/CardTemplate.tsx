import React, { forwardRef } from 'react';
import { CandidateProfile, CardFormat } from '../types';

interface CardTemplateProps {
  data: CandidateProfile;
  format: 'a4' | 'story' | 'square';
  scale?: number;
}

// We use forwardRef so the parent can capture this DOM element for image generation
export const CardTemplate = forwardRef<HTMLDivElement, CardTemplateProps>(({ data, format, scale = 1 }, ref) => {
  
  // Dimensions based on format
  const dimensions = {
    a4: { w: 794, h: 1123, aspect: 'aspect-[210/297]' }, // ~96 DPI A4
    story: { w: 1080, h: 1920, aspect: 'aspect-[9/16]' },
    square: { w: 1080, h: 1080, aspect: 'aspect-square' },
  };

  const dim = dimensions[format];

  // Dynamic styles based on format
  const isVertical = format === 'story';
  const isSquare = format === 'square';
  const isA4 = format === 'a4';
  
  // Font scaling factor
  const baseSize = isVertical ? 'text-3xl' : 'text-xl';
  // Title needs to be MUCH bigger now and original font
  const titleSize = isVertical ? 'text-7xl' : isSquare ? 'text-5xl' : 'text-5xl';
  const nameSize = isVertical ? 'text-6xl' : 'text-4xl';

  return (
    <div 
      ref={ref}
      className={`bg-white relative overflow-hidden flex flex-col shadow-2xl origin-top-left text-slate-800`}
      style={{
        width: `${dim.w}px`,
        height: `${dim.h}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Header Band - Bigger and bolder with Primary Green */}
      <div className="bg-domessin-primary min-h-[15%] flex flex-col items-center justify-center px-8 relative py-8">
        <h1 className={`${titleSize} font-original text-white text-center leading-none drop-shadow-md`}>
          Une alternative <br/> pour Domessin
        </h1>
        {/* Underline in Secondary Yellow */}
        <div className="h-2 w-32 bg-domessin-secondary mt-4 rounded-full"></div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 p-8 ${isA4 ? 'pb-32' : 'pb-12'} ${isVertical ? 'flex flex-col gap-10' : 'grid grid-cols-12 gap-8'}`}>
        
        {/* Left Column (Photo + Name) */}
        <div className={`${isVertical ? 'w-full text-center' : 'col-span-4 flex flex-col items-center text-center'} pt-4`}>
          {/* Round Photo */}
          <div className={`relative ${isVertical ? 'w-80 h-80' : 'w-56 h-56'} mx-auto mb-6 rounded-full overflow-hidden border-8 border-slate-100 shadow-xl bg-white`}>
            {data.photoUrl ? (
              <img src={data.photoUrl} alt="Candidat" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                <span>Photo</span>
              </div>
            )}
          </div>
          
          <h2 className={`${nameSize} font-display font-black text-domessin-primary leading-tight mb-2 uppercase tracking-tight`}>
            {data.firstName} <br/> <span className="text-domessin-secondary">{data.lastName}</span>
          </h2>
          <div className="text-gray-400 font-display font-semibold uppercase tracking-widest text-sm mt-2">
            Candidat(e)
          </div>
        </div>

        {/* Right Column (Content) - Using cleaner cards */}
        <div className={`${isVertical ? 'w-full px-4' : 'col-span-8 pr-4'} flex flex-col justify-center gap-6 relative`}>
          
          {/* Section 1 */}
          <div className="relative">
             <h3 className={`${baseSize} font-original text-domessin-primary mb-2 pl-4 border-l-4 border-domessin-primary`}>
              {data.bioTitle || "Qui suis-je ?"}
            </h3>
            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm">
              <p className={`${baseSize} font-sans text-slate-700 leading-relaxed whitespace-pre-wrap text-justify`}>
                {data.bio || "Section à remplir..."}
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="relative">
             <h3 className={`${baseSize} font-original text-domessin-secondary mb-2 pl-4 border-l-4 border-domessin-secondary`}>
              {data.goalsTitle || "Mes envies pour la commune"}
            </h3>
            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm">
              <p className={`${baseSize} font-sans text-slate-700 leading-relaxed whitespace-pre-wrap text-justify`}>
                {data.goals || "Section à remplir..."}
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="relative">
            <h3 className={`${baseSize} font-original text-domessin-primary mb-2 pl-4 border-l-4 border-domessin-primary`}>
              {data.commissionsTitle || "Les commissions"}
            </h3>
            <div className="bg-slate-50 p-6 rounded-2xl shadow-sm">
              <p className={`${baseSize} font-sans text-slate-700 leading-relaxed whitespace-pre-wrap text-justify`}>
                {data.commissions || "Section à remplir..."}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="h-[8%] bg-slate-900 flex items-center justify-between px-12 text-white relative z-20">
         <span className={`${isSquare ? 'text-lg' : 'text-xl'} font-bold font-display opacity-80`}>Élections Municipales</span>
         <span className={`${isSquare ? 'text-lg' : 'text-xl'} font-original text-domessin-light tracking-wide`}>domessin-alternative.fr</span>
      </div>
    </div>
  );
});

CardTemplate.displayName = 'CardTemplate';