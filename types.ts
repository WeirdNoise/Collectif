
export enum Step {
  COLLECT = 1,
  GENERATE = 2
}

export interface CandidateProfile {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  photoEnhanced?: boolean; // New field for auto-enhancement
  
  // Section 1
  bioTitle: string;
  bio: string;
  
  // Section 2
  goalsTitle: string;
  goals: string;
  
  // Section 3
  commissionsTitle: string;
  commissions: string;
}

export type SectionKey = 'bio' | 'goals' | 'commissions';

export interface CardFormat {
  id: 'a4' | 'story' | 'square';
  name: string;
  width: number;
  height: number;
  label: string;
}
