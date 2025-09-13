import { sql } from "drizzle-orm";
import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  dob: text("dob").notNull(),
  age: integer("age").notNull(),
  doseWeight: text("dose_weight").notNull(),
  sex: text("sex").notNull(),
  mrn: text("mrn").notNull(),
  fin: text("fin").notNull(),
  admitted: text("admitted").notNull(),
  isolation: text("isolation").notNull(),
  bed: text("bed").notNull(),
  allergies: text("allergies").notNull(),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
  notes: text("notes").notNull(),
  department: text("department").notNull(),
  chartData: text("chart_data"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const medicines = pgTable("medicines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  drawer: text("drawer").notNull().default("A1"),
  bin: text("bin").notNull().default("01"),
  dosage: text("dosage").notNull().default("Standard dose"),
  category: text("category"), // medication category (e.g., 'pain-killer', 'antibiotic', 'anti-nausea')
  is_narcotic: integer("is_narcotic").notNull().default(0), // 1 for controlled substances/narcotics, 0 for regular meds
  dose: text("dose").notNull().default("Standard dose"), // specific dose amount (e.g., "5mg", "10ml")
  route: text("route").notNull().default("PO"), // route of administration (PO, IV, IM, etc.)
  frequency: text("frequency").notNull().default("once daily"), // frequency/schedule (q4h, BID, once daily, etc.)
  is_prn: integer("is_prn").notNull().default(0), // 1 if PRN (as needed), 0 if scheduled
});

export const prescriptions = pgTable("prescriptions", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  medicineId: text("medicine_id").notNull().references(() => medicines.id),
  dosage: text("dosage").notNull(), // e.g., "10mg", "2 tablets", "5ml"
  periodicity: text("periodicity").notNull(), // e.g., "Every 4 hours", "Twice daily", "As needed"
  duration: text("duration"), // e.g., "5 days", "2 weeks", "1 month", "Ongoing"
  route: text("route").notNull().default("Oral"), // e.g., "Oral", "IV", "IM", "Topical", "Inhaled"
  startDate: timestamp("start_date"), // When to start administering
  endDate: timestamp("end_date"), // When to stop administering
  totalDoses: integer("total_doses"), // Total number of doses for scheduled medications (null for PRN/as needed)
  completed: integer("completed").default(0), // 1 if prescription is completed (all doses administered), 0 if active
});

export const administrations = pgTable("administrations", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  medicineId: text("medicine_id").notNull().references(() => medicines.id),
  prescriptionId: text("prescription_id").references(() => prescriptions.id), // Link to specific prescription
  administeredAt: timestamp("administered_at").default(sql`now()`),
  administeredBy: text("administered_by"), // user ID who administered
  status: text("status").notNull(), // 'collected', 'administered', 'warning', 'error'
  message: text("message").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'patient', 'administration', 'prescription'
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'administer'
  changes: text("changes"),
  timestamp: timestamp("timestamp").default(sql`now()`),
  userId: text("user_id"), // For future user tracking
});

export const labTestTypes = pgTable("lab_test_types", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g., "CBC-HGB", "BMP-GLU"
  name: text("name").notNull(), // e.g., "Complete Blood Count - Hemoglobin"
  category: text("category"), // e.g., "Hematology", "Chemistry", "Endocrinology"
  unit: text("unit"), // e.g., "g/dL", "mg/dL", "%"
  referenceRange: text("reference_range"), // normal range for this test
  isActive: integer("is_active").default(1), // 1 = active, 0 = inactive
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const labResults = pgTable("lab_results", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  testName: text("test_name").notNull(), // e.g., "Complete Blood Count", "Basic Metabolic Panel"
  testCode: text("test_code"), // e.g., "CBC", "BMP", "HbA1c"
  value: text("value").notNull(), // the test result value
  unit: text("unit"), // e.g., "mg/dL", "mmol/L", "%"
  referenceRange: text("reference_range"), // normal range for this test
  status: text("status").notNull(), // 'normal', 'abnormal', 'critical', 'pending'
  takenAt: timestamp("taken_at").notNull(), // when the lab was collected
  resultedAt: timestamp("resulted_at"), // when results were available
  notes: text("notes"), // additional notes from lab
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  pin: text("pin").notNull(),
  role: text("role").notNull(), // 'instructor', 'student', 'admin'
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const vitals = pgTable("vitals", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  pulse: integer("pulse").notNull(), // beats per minute
  temperature: text("temperature").notNull(), // e.g., "98.6°F", "37.0°C"
  respirationRate: integer("respiration_rate").notNull(), // breaths per minute
  bloodPressureSystolic: integer("blood_pressure_systolic").notNull(), // mmHg
  bloodPressureDiastolic: integer("blood_pressure_diastolic").notNull(), // mmHg
  oxygenSaturation: integer("oxygen_saturation"), // percentage
  notes: text("notes"), // additional notes
  takenAt: timestamp("taken_at").default(sql`now()`),
  takenBy: text("taken_by"), // who recorded the vitals
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  createdAt: true,
});

export const insertMedicineSchema = createInsertSchema(medicines);

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  totalDoses: true, // Will be calculated automatically for scheduled medications
});

export const insertAdministrationSchema = createInsertSchema(administrations).omit({
  id: true,
  administeredAt: true,
}).superRefine((data, ctx) => {
  // SECURITY REQUIREMENT: prescriptionId is required for administered medications
  // This prevents bypassing follow-up validation by omitting prescription context
  if (data.status === 'administered' && !data.prescriptionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['prescriptionId'],
      message: 'prescriptionId is required for administered medications to ensure proper protocol validation'
    });
  }
  
  // SECURITY REQUIREMENT: prescriptionId should be provided for all prescription-based records
  // Only allow missing prescriptionId for error cases, warnings, or non-prescription related entries  
  if (['collected', 'administered'].includes(data.status) && !data.prescriptionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['prescriptionId'],
      message: 'prescriptionId is required for collected/administered status to maintain medication safety protocols'
    });
  }
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertLabTestTypeSchema = createInsertSchema(labTestTypes).omit({
  id: true,
  createdAt: true,
});

export const insertLabResultSchema = createInsertSchema(labResults).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertVitalsSchema = createInsertSchema(vitals).omit({
  id: true,
  createdAt: true,
  takenAt: true, // Remove takenAt from required fields
});

// Care Notes table
export const careNotes = pgTable("care_notes", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  content: text("content").notNull(),
  category: text("category").notNull(), // 'nursing', 'physician', 'therapy', etc.
  createdBy: text("created_by").notNull(), // user ID
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Provider Orders table
export const providerOrders = pgTable("provider_orders", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  orderType: text("order_type").notNull(), // 'medication', 'diet', 'activity', 'lab', 'procedure'
  description: text("description").notNull(),
  status: text("status").notNull(), // 'active', 'discontinued', 'pending', 'completed'
  orderedBy: text("ordered_by").notNull(), // provider name
  orderedAt: timestamp("ordered_at").default(sql`now()`),
  discontinuedAt: timestamp("discontinued_at"),
  discontinuedBy: text("discontinued_by"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Intake/Output table
export const intakeOutput = pgTable("intake_output", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  type: text("type").notNull(), // 'intake' or 'output'
  category: text("category").notNull(), // 'oral', 'iv', 'urine', 'emesis', etc.
  amount: integer("amount").notNull(), // in mL
  description: text("description"),
  recordedAt: timestamp("recorded_at").default(sql`now()`),
  recordedBy: text("recorded_by"), // who recorded it
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Assessments table
export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  assessmentType: text("assessment_type").notNull(), // 'pain_scale', 'neurological', 'fall_risk', etc.
  score: integer("score"), // numerical score if applicable
  description: text("description"), // text description of assessment
  findings: text("findings"), // assessment findings
  assessedAt: timestamp("assessed_at").default(sql`now()`),
  assessedBy: text("assessed_by"), // who performed assessment
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Imaging Files table
export const imagingFiles = pgTable("imaging_files", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  studyType: text("study_type").notNull(), // 'xray', 'ct', 'mri', 'ultrasound'
  studyDescription: text("study_description").notNull(),
  bodyPart: text("body_part"), // e.g., 'chest', 'abdomen', 'head'
  findings: text("findings"), // radiologist findings
  impression: text("impression"), // radiologist impression
  studyDate: timestamp("study_date").notNull(),
  reportedBy: text("reported_by"), // radiologist name
  imageUrl: text("image_url"), // URL to image file (simulated)
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Care Plans table
export const carePlans = pgTable("care_plans", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  problem: text("problem").notNull(), // nursing diagnosis/problem
  goal: text("goal").notNull(), // patient goal
  interventions: text("interventions").notNull(), // nursing interventions
  evaluation: text("evaluation"), // evaluation of effectiveness
  priority: text("priority").notNull(), // 'high', 'medium', 'low'
  status: text("status").notNull(), // 'active', 'resolved', 'ongoing'
  createdBy: text("created_by").notNull(), // user ID
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertCareNotesSchema = createInsertSchema(careNotes).omit({
  id: true,
  createdAt: true,
});

export const insertProviderOrdersSchema = createInsertSchema(providerOrders).omit({
  id: true,
  createdAt: true,
});

export const insertIntakeOutputSchema = createInsertSchema(intakeOutput).omit({
  id: true,
  createdAt: true,
});

export const insertAssessmentsSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
});

export const insertImagingFilesSchema = createInsertSchema(imagingFiles).omit({
  id: true,
  createdAt: true,
});

export const insertCarePlansSchema = createInsertSchema(carePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export table types
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Medicine = typeof medicines.$inferSelect;
export type Prescription = typeof prescriptions.$inferSelect;
export type Administration = typeof administrations.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type LabTestType = typeof labTestTypes.$inferSelect;
export type LabResult = typeof labResults.$inferSelect;
export type Vitals = typeof vitals.$inferSelect;
export type CareNotes = typeof careNotes.$inferSelect;
export type ProviderOrders = typeof providerOrders.$inferSelect;
export type IntakeOutput = typeof intakeOutput.$inferSelect;
export type Assessments = typeof assessments.$inferSelect;
export type ImagingFiles = typeof imagingFiles.$inferSelect;
export type CarePlans = typeof carePlans.$inferSelect;

// Export insert types using drizzle's infer system
export type InsertUser = typeof users.$inferInsert;
export type InsertSession = typeof sessions.$inferInsert;
export type InsertPatient = typeof patients.$inferInsert;
export type InsertMedicine = typeof medicines.$inferInsert;
export type InsertPrescription = typeof prescriptions.$inferInsert;
export type InsertAdministration = typeof administrations.$inferInsert;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type InsertLabTestType = typeof labTestTypes.$inferInsert;
export type InsertLabResult = typeof labResults.$inferInsert;
export type InsertVitals = typeof vitals.$inferInsert;
export type InsertCareNotes = typeof careNotes.$inferInsert;
export type InsertProviderOrders = typeof providerOrders.$inferInsert;
export type InsertIntakeOutput = typeof intakeOutput.$inferInsert;
export type InsertAssessments = typeof assessments.$inferInsert;
export type InsertImagingFiles = typeof imagingFiles.$inferInsert;
export type InsertCarePlans = typeof carePlans.$inferInsert;

// Medication Links table - Templates for linking medications in protocols
export const medicationLinks = pgTable("medication_links", {
  id: text("id").primaryKey(),
  triggerMedicineId: text("trigger_medicine_id").notNull().references(() => medicines.id), // Medicine A (initial dose)
  followMedicineId: text("follow_medicine_id").notNull().references(() => medicines.id), // Medicine B (follow-up)
  followFrequency: text("follow_frequency").notNull(), // e.g., "Every 4 hours", "q4h"
  followDurationHours: integer("follow_duration_hours").notNull(), // How long to continue follow-up (in hours)
  delayMinutes: integer("delay_minutes").notNull().default(0), // Delay in minutes before follow-up medication starts
  startAfter: text("start_after").notNull().default('after_first_admin'), // 'after_first_admin' | 'immediate'
  requiredPrompt: integer("required_prompt").notNull().default(1), // 1 = prompt when prescribing trigger, 0 = optional
  defaultDoseOverride: text("default_dose_override"), // Optional dose override for follow-up medicine
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Protocol Instances table - Per-patient instances of medication protocols
export const protocolInstances = pgTable("protocol_instances", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id),
  linkId: text("link_id").notNull().references(() => medicationLinks.id),
  triggerPrescriptionId: text("trigger_prescription_id").notNull().references(() => prescriptions.id),
  followPrescriptionId: text("follow_prescription_id").notNull().references(() => prescriptions.id),
  activatedAt: timestamp("activated_at"), // null until trigger medicine is administered
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertMedicationLinksSchema = createInsertSchema(medicationLinks).omit({
  id: true,
  createdAt: true,
});

export const insertProtocolInstancesSchema = createInsertSchema(protocolInstances).omit({
  id: true,
  createdAt: true,
});

export type MedicationLink = typeof medicationLinks.$inferSelect;
export type ProtocolInstance = typeof protocolInstances.$inferSelect;
export type InsertMedicationLink = typeof medicationLinks.$inferInsert;
export type InsertProtocolInstance = typeof protocolInstances.$inferInsert;
