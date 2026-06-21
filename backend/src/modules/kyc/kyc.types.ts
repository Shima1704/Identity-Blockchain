export interface CCCDData {
  cccd_number:    string;
  full_name:      string;
  dob:            string;
  gender:         string;
  hometown:       string;
  address:        string;
  expiry:         string;
  ocr_confidence: number;
}

export interface FaceResult {
  matchScore:    number;
  livenessScore: number;
  isMatch:       boolean;
}

export interface KycSession {
  cccdData:    CCCDData;
  cccdHash:    string;
  faceResult?: FaceResult;
  step:        'cccd_done' | 'face_done';
  timestamp:   number;
}

export interface KYCProfileResponse {
  kyc_status: string;
  did?: string;
  kyc_score?: number;
  face_match?: number;
  kyc_verified_at?: Date;
  tx_hash?: string;
  profile?: {
    full_name: string;
    dob: string;
    age: number | null;
    gender: string;
    hometown: string;
    address: string;
    nationality: string;
    cccd_number: string;
    cccd_expiry: string;
    cccd_front_url?: string;   // URL or path to front image
    cccd_back_url?: string;    // URL or path to back image
  };
}
