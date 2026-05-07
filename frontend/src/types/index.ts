export interface User {
  _id: string;
  name: string;
  email: string;
  dob: string;
  age: number;
  bio: string;
  activities: string[];
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  schedule: string[];
  gritPoints: number;
  localHero: boolean;
  vibeCheckDone: boolean;
  ageVerified: boolean;
  avatar: string | null;
  lat: number | null;
  lng: number | null;
  endorsements?: Record<string, number>;
}

export interface MatchUser extends Partial<User> {
  dist?: string;
  blurredLat?: number;
  blurredLng?: number;
  matchReason: string;
}

export interface Match {
  _id: string;
  from: string;
  to: string;
  status: 'pending' | 'matched' | 'declined';
  peer?: Partial<User>;
  sender?: Partial<User>;
}

export interface Short {
  _id: string;
  userId: string;
  caption: string;
  activity: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  claps: number;
  clappers: string[];
  workoutTemplate: any;
  savedBy: string[];
  pinned?: boolean;
  author?: { name: string; avatar: string | null; gritPoints: number; localHero: boolean };
  createdAt: string;
}

export interface Message {
  _id: string;
  from: string;
  to: string;
  text: string;
  createdAt: string;
}

export const ACTIVITIES = ['Running','Cycling','Yoga','Powerlifting','HIIT','Swimming','Tennis','Basketball','Walking','CrossFit','Pilates','Boxing'];
export const SCHEDULES = ['Early Morning (5-7am)','Morning (7-9am)','Midday (11am-1pm)','Afternoon (3-5pm)','Evening (5-7pm)','Night (7-9pm)','Weekends Only'];
export const FITNESS_LEVELS = ['Beginner','Intermediate','Advanced'] as const;
export const ENDORSEMENTS = ['Punctual','Motivating','Knowledgeable','Supportive','Fun'];
