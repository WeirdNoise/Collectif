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
  // A4 uses text-lg (18px) to allow more content to fit vertically compared to Square
  const baseSize = isVertical ? 'text-3xl' : isA4 ? 'text-lg' : 'text-xl';
  
  // Title scaling
  // A4 uses text-5xl to match the visual weight of Square, ensuring the logo looks identical
  const titleSize = isVertical ? 'text-7xl' : 'text-5xl';
  
  const nameSize = isVertical ? 'text-6xl' : 'text-4xl';
  
  // Layout spacing adjustments for A4 to prevent overflow
  const sectionGap = isA4 ? 'gap-4' : 'gap-6';
  const bottomPadding = isA4 ? 'pb-48' : 'pb-12';

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
      {/* Added flex-shrink-0 to prevent layout squashing on A4 */}
      <div className="bg-domessin-primary min-h-[15%] flex-shrink-0 flex flex-col items-center justify-center px-8 relative py-8">
        <h1 className={`${titleSize} font-original text-white text-center leading-none drop-shadow-md`}>
          Une alternative <br/> pour Domessin
        </h1>
        {/* Underline in Secondary Yellow - Present on all formats */}
        <div className="h-2 w-32 bg-domessin-secondary mt-4 rounded-full"></div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 p-8 ${bottomPadding} ${isVertical ? 'flex flex-col gap-10' : 'grid grid-cols-12 gap-8'}`}>
        
        {/* Left Column (Photo + Name) */}
        <div className={`${isVertical ? 'w-full text-center' : 'col-span-4 flex flex-col items-center text-center'} pt-4`}>
          {/* Round Photo */}
          <div className={`relative ${isVertical ? 'w-80 h-80' : 'w-56 h-56'} mx-auto mb-6 rounded-full overflow-hidden border-8 border-slate-100 shadow-xl bg-white`}>
            {data.photoUrl ? (
              <img src={data.photoUrl} alt="Candidat" className="w-full h-full object-cover object-top" />
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
        <div className={`${isVertical ? 'w-full px-4' : 'col-span-8 pr-4'} flex flex-col justify-center ${sectionGap} relative`}>
          
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
    </div>
  );
});

CardTemplate.displayName = 'CardTemplate';