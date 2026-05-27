export interface StudentPayload {
  basic: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  };
  education: {
    educationType: 'COLLEGE' | 'HIGH_SCHOOL' | 'DIPLOMA';
    collegeName: string;
    degree: string;
    branch: string;
    currentYear: string;
  };
  goals: {
    targetIndustries: string[];
    targetCompanies: string[];
    bio: string;
  };
}

export interface EmployeePayload {
  basic: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  };
  professional: {
    company: string;
    jobTitle: string;
    industry: string;
    yearsExp: number;
  };
  verification: {
    companyEmail: string;
    documentUrls: string[]; // URLs from Cloudinary uploads
  };
  pricing: {
    pricePerCall: number; // in paise
    topics: string[];
    bio: string;
    availabilitySlots: {
      mon: string[];
      tue: string[];
      wed: string[];
      thu: string[];
      fri: string[];
      sat: string[];
      sun: string[];
    };
    payoutMethod: 'UPI' | 'BANK' | 'PAYTM';
    upiId?: string;
    accountNumber?: string;
    ifscCode?: string;
    paytmMobile?: string;
  };
  social: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    twitter?: string;
  };
  location: {
    country: string;
    state: string;
    city: string;
    timezone: string;
  };
}

export interface ParentPayload {
  basic: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  };
  child: {
    childStage: string;
    childCourse: string;
    concerns: string[];
    openToConnect: boolean;
  };
  location: {
    country: string;
    state: string;
    city: string;
    timezone: string;
  };
}

export type SignupPayload = StudentPayload | EmployeePayload | ParentPayload

export interface SignupResponse {
  success: boolean;
  message: string;
  userId: string;
  role: 'student' | 'employee' | 'parent';
  token?: string;
}

export interface SignupError {
  code: string;
  message: string;
  field?: string;
}

export const SignupErrorCodes = {
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  INVALID_COMPANY_EMAIL: 'INVALID_COMPANY_EMAIL',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type SignupErrorCode = typeof SignupErrorCodes[keyof typeof SignupErrorCodes];