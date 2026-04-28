export interface UserPreferences {
  mode: 'voice' | 'touch' | 'accessible' | null;
  language: 'english' | 'hinglish';
  voiceFeedback: boolean;
  setupComplete: boolean;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface Hospital {
  id: string;
  name: string;
  location: Location;
  bedsAvailable: number;
  icuAvailable: number;
  contact: string;
}

export interface Ambulance {
  id: string;
  vehicleNumber: string;
  location: Location;
  isAvailable: boolean;
  status: "idle" | "en-route" | "busy";
}

export interface BloodBank {
  id: string;
  name: string;
  location: Location;
  inventory: Record<string, number>;
}

export interface AllocationResult {
  extractedEmergencyType: string;
  severity: "critical" | "high" | "moderate" | "low";
  recommendedHospitalId: string;
  recommendedAmbulanceId: string;
  recommendedBloodBankId?: string;
  explanation: string;
  hospital?: Hospital;
  ambulance?: Ambulance;
  bloodBank?: BloodBank;
}
