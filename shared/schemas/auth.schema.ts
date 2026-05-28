import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupBasicSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Student schemas
export const studentEducationSchema = z.object({
  educationType: z.enum(['SCHOOL', 'COLLEGE']),
  // School fields
  schoolName: z.string().optional(),
  className: z.string().optional(),
  stream: z.string().optional(),
  // College fields
  collegeName: z.string().optional(),
  degree: z.string().optional(),
  branch: z.string().optional(),
  currentYear: z.string().optional(),
  collegeEmail: z.string().email().optional(),
  city: z.string().optional(),
});

export const studentGoalsSchema = z.object({
  targetIndustries: z.array(z.string()).min(1, 'Select at least one industry'),
  targetCompanies: z.array(z.string()).max(5, 'Maximum 5 companies'),
  bio: z.string().max(150, 'Bio must be less than 150 characters').optional(),
  howDidYouHear: z.string().optional(),
});

// Employee schemas
export const employeeProfessionalSchema = z.object({
  company: z.string().min(2, 'Company name is required'),
  jobTitle: z.string().min(2, 'Job title is required'),
  industry: z.string().min(2, 'Industry is required'),
  yearsExp: z.number().min(0, 'Years of experience must be positive'),
  workCity: z.string().optional(),
  linkedInUrl: z.string().url().optional(),
});

export const employeeVerificationSchema = z.object({
  linkedInConnected: z.boolean().optional(),
  companyEmail: z.string().email().optional(),
});

// Fix 1: AvailabilitySlot schema (replaces raw JSON availabilitySlots)
export const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm in 24h format'),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm in 24h format'),
  timezone: z.string().default('Asia/Kolkata'),
});

export const availabilitySlotsArraySchema = z.array(availabilitySlotSchema);

export const employeePricingSchema = z.object({
  pricePerCall: z.number().min(0, 'Price must be positive'),
  // Fix 1: Now expects an array of AvailabilitySlot objects instead of day-keyed JSON
  availabilitySlots: availabilitySlotsArraySchema.default([]),
  payoutMethod: z.enum(['UPI', 'BANK']),
  upiId: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  bio: z.string().max(300, 'Bio must be less than 300 characters').optional(),
  topics: z.array(z.string()).min(1, 'Select at least one topic'),
});

// Parent schemas
export const parentChildSchema = z.object({
  childStage: z.string().min(1, 'Child stage is required'),
  childCourse: z.string().min(1, 'Child course is required'),
  concerns: z.array(z.string()).min(1, 'Select at least one concern'),
  openToConnect: z.boolean().default(true),
});

// Booking schemas
export const bookingSchema = z.object({
  employeeId: z.string(),
  scheduledAt: z.string().datetime(),
  topic: z.string().min(20, 'Topic must be at least 20 characters').max(300),
  durationMins: z.coerce.number().int().min(1).max(480).optional().default(15),
  notes: z.string().max(500).optional(),
  amountPaid: z.coerce.number().int().min(0).optional().default(0),
});

// Review schemas
export const reviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().min(1).max(5),
  text: z.string().max(300).optional(),
});

// ---------------------------------------------------------------------------
// Session User Schema — runtime validation for next-auth session user
// Mirrors the UserRole type and AuthenticatedSession interface
// ---------------------------------------------------------------------------

export const sessionUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  role: z.enum(["STUDENT", "EMPLOYEE", "PARENT", "ADMIN"]),
  email: z.string().email().nullable().optional(),
  name: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  isNewGoogleUser: z.boolean().optional(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

// Verification schemas
export const otpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const idUploadSchema = z.object({
  documentType: z.enum(['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENCE']),
  file: z.any().refine((file) => file?.size <= 5 * 1024 * 1024, 'File size must be less than 5MB'),
});
