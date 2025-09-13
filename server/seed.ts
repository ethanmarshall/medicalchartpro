import { db } from "./db";
import { patients, medicines, prescriptions, labTestTypes, labResults, providerOrders, careNotes, administrations, imagingFiles, sessions, users, intakeOutput, assessments, vitals } from "@shared/schema";

const initialPatients = [
  {
    id: '223344556677',
    name: 'Maria Garcia',
    dob: '1991-02-14',
    age: 34,
    doseWeight: '70 kg',
    sex: 'Female',
    mrn: 'MN-789123456',
    fin: 'FN-789123456',
    admitted: '2025-08-27',
    codeStatus: 'Full Code',
    isolation: 'None',
    bed: 'LD-104',
    allergies: 'Penicillin (rash)',
    status: 'Induction',
    provider: 'Dr. Rodriguez',
    notes: 'ADMISSION: 08/27/2025 @ 08:00 for scheduled induction for post-term pregnancy.\n\nLABOR STATUS: G3 P2, 41 weeks 1 day gestation. Cervix 1 cm dilated, 50% effaced, -3 station. Membranes intact. Contractions irregular, mild Braxton Hicks.\n\nMEDICAL HISTORY: Two previous spontaneous vaginal deliveries. Iron-deficiency anemia. Blood Type: A-.',
    department: 'Labor & Delivery',
    chartData: {
      background: 'Multigravida (G3 P2) patient at 41 weeks 1 day gestation for scheduled induction.',
      summary: 'Post-term pregnancy requiring induction with history of uncomplicated deliveries.',
      discharge: 'To be determined based on delivery outcome.',
      handoff: 'Patient scheduled for induction, monitor response to Pitocin and fetal tolerance.'
    }
  },
  {
    id: '334455667788',
    name: 'Emily Chen',
    dob: '1993-09-12',
    age: 31,
    doseWeight: '68 kg',
    sex: 'Female',
    mrn: 'MN-123456789',
    fin: 'FN-123456789',
    admitted: '2025-08-27',
    codeStatus: 'Full Code',
    isolation: 'None',
    bed: 'OR-3',
    allergies: 'None',
    status: 'Pre-operative',
    provider: 'Dr. Kim',
    notes: 'ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\n\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\n\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+.',
    department: 'Labor & Delivery',
    chartData: {
      background: 'Primigravida with dichorionic-diamniotic twins scheduled for Cesarean delivery.',
      summary: 'Twin pregnancy at term equivalent with breech presentation requiring surgical delivery.',
      discharge: 'To be determined post-operatively.',
      handoff: 'Pre-operative patient for scheduled C-section, twins require NICU evaluation.'
    }
  },
  {
    id: '445566778899',
    name: 'Aisha Williams',
    dob: '2000-12-10',
    age: 24,
    doseWeight: '58 kg',
    sex: 'Female',
    mrn: 'MN-987654321',
    fin: 'FN-987654321',
    admitted: '2025-08-27',
    codeStatus: 'Full Code',
    isolation: 'None',
    bed: 'LD-106',
    allergies: 'None',
    status: 'Preterm Labor',
    provider: 'Dr. Johnson',
    notes: 'ADMISSION: 08/27/2025 @ 02:15 for reports of regular, painful contractions.\n\nLABOR STATUS: G2 P1, 33 weeks 2 days gestation. Cervix 2 cm dilated, 75% effaced, -2 station. Membranes intact. Contractions every 5-7 minutes, lasting 45 seconds.\n\nMEDICAL HISTORY: Previous preterm delivery at 35 weeks. Blood Type: AB+.',
    department: 'Labor & Delivery',
    chartData: {
      background: 'Multigravida with history of preterm delivery presenting with preterm labor.',
      summary: 'Preterm labor at 33 weeks requiring tocolysis and fetal neuroprotection.',
      discharge: 'To be determined based on response to treatment.',
      handoff: 'Preterm labor patient on strict bed rest with magnesium sulfate and betamethasone.'
    }
  },
  {
    id: '556677889900',
    name: 'Sophia Miller',
    dob: '1987-06-25',
    age: 37,
    doseWeight: '72 kg',
    sex: 'Female',
    mrn: 'MN-654321987',
    fin: 'FN-654321987',
    admitted: '2025-08-27',
    codeStatus: 'Full Code',
    isolation: 'Seizure Precautions',
    bed: 'LD-108',
    allergies: 'Codeine (nausea)',
    status: 'Severe Preeclampsia',
    provider: 'Dr. Thompson',
    notes: 'ADMISSION: 08/27/2025 @ 10:45 for elevated blood pressure (165/112) and proteinuria at routine appointment. Reports headache and visual spots.\n\nLABOR STATUS: G1 P0, 36 weeks 0 days gestation. Cervix unfavorable, closed. Membranes intact. No contractions.\n\nMEDICAL HISTORY: Chronic hypertension. Blood Type: O-.',
    department: 'Labor & Delivery',
    chartData: {
      background: 'Primigravida with chronic hypertension developing severe preeclampsia.',
      summary: 'Severe preeclampsia requiring magnesium sulfate and delivery planning.',
      discharge: 'To be determined based on maternal and fetal status.',
      handoff: 'Patient on seizure precautions with magnesium sulfate, monitor BP and symptoms.'
    }
  },
  {
    id: '667788990011',
    name: 'Chloe Johnson',
    dob: '1992-04-18',
    age: 32,
    doseWeight: '64 kg',
    sex: 'Female',
    mrn: 'MN-555444333',
    fin: 'FN-555444333',
    admitted: '2025-08-27',
    codeStatus: 'Full Code',
    isolation: 'None',
    bed: 'LD-110',
    allergies: 'Sulfa drugs (hives)',
    status: 'TOLAC',
    provider: 'Dr. Anderson',
    notes: 'ADMISSION: 08/27/2025 @ 11:15 for spontaneous active labor, desires Trial of Labor After Cesarean (TOLAC).\n\nLABOR STATUS: G2 P1, 40 weeks 2 days gestation. Cervix 5 cm dilated, 100% effaced, 0 station. Membranes intact. Contractions every 3 minutes, lasting 60-70 seconds, strong intensity.\n\nMEDICAL HISTORY: One previous C-section for fetal distress. Confirmed low transverse uterine incision. Blood Type: A+.',
    department: 'Labor & Delivery',
    chartData: {
      background: 'VBAC candidate with previous low transverse C-section in active labor.',
      summary: 'Trial of Labor After Cesarean with favorable cervical exam and strong labor pattern.',
      discharge: 'To be determined based on labor progress and TOLAC success.',
      handoff: 'TOLAC patient requiring continuous monitoring, consent signed for repeat C-section if needed.'
    }
  },
  // Infant Patient Profiles
  {
    id: '789123456789',
    name: 'Baby Boy Smith',
    dob: '2025-08-27',
    age: 0,
    doseWeight: '3.4 kg',
    sex: 'Male',
    mrn: 'MN-987654321098',
    fin: 'FN-987654321098',
    admitted: '2025-08-27',
    codeStatus: 'Full Code',
    isolation: 'None',
    bed: 'NB-03',
    allergies: 'None',
    status: 'Observation',
    provider: 'Dr. Martinez',
    notes: 'BIRTH: 08/27/2025 @ 10:52, Spontaneous Vaginal Delivery\n\nPARENT: Olivia Smith (MRN: MN-456789123)\n\nGESTATION: 39 weeks 4 days\n\nBIRTH DETAILS: Birth Weight 3.4 kg (7 lbs 8 oz), Length 51 cm. APGAR Scores: 8 (1 min), 9 (5 min)\n\nVITALS: T: 37.0°C, HR: 145, RR: 50\n\nCARE PLAN: Breastfeeding on demand, routine newborn care',
    department: 'Newborn',
    chartData: {
      background: 'Term newborn male delivered via spontaneous vaginal delivery to primigravida mother.',
      summary: 'Healthy term newborn with excellent APGAR scores, stable vital signs.',
      discharge: 'Pending completion of newborn screenings and feeding establishment.',
      handoff: 'Stable newborn requiring routine care and screenings.'
    }
  },
  {
    id: '890234567890',
    name: 'Baby Girl Garcia',
    dob: '2025-08-27',
    age: 0,
    doseWeight: '4.0 kg',
    sex: 'Female',
    mrn: 'MN-876543210987',
    fin: 'FN-876543210987',
    admitted: '2025-08-27',
    codeStatus: 'Full Code',
    isolation: 'None',
    bed: 'NB-02',
    allergies: 'None',
    status: 'Observation',
    provider: 'Dr. Rodriguez',
    notes: 'BIRTH: 08/27/2025 @ 11:01, Pitocin-augmented Vaginal Delivery\n\nPARENT: Maria Garcia (MRN: MN-789123456)\n\nGESTATION: 41 weeks 1 day (post-term)\n\nBIRTH DETAILS: Birth Weight 4.0 kg (8 lbs 13 oz), Length 53 cm. APGAR Scores: 9 (1 min), 9 (5 min)\n\nVITALS: T: 36.8°C, HR: 150, RR: 48. Note: Mild peeling skin, common for post-term infants\n\nCARE PLAN: Formula feeding 1-2 oz every 3-4 hours, glucose monitoring due to large size',
    department: 'Newborn',
    chartData: {
      background: 'Post-term newborn female delivered via augmented vaginal delivery, large for gestational age.',
      summary: 'Post-term large newborn with excellent APGAR scores requiring glucose monitoring.',
      discharge: 'Pending stable glucose levels and feeding tolerance.',
      handoff: 'Large post-term newborn requiring glucose monitoring before first three feeds.'
    }
  },
  {
    id: '901345678901',
    name: 'Baby A Chen (Twin 1)',
    dob: '2025-08-27',
    age: 0,
    doseWeight: '2.6 kg',
    sex: 'Female',
    mrn: '334455667789',
    fin: '334455667789',
    admitted: '2025-08-27',
    codeStatus: 'Full Code',
    isolation: 'None',
    bed: 'NB-04',
    allergies: 'None',
    status: 'Observation',
    provider: 'Dr. Kim',
    notes: 'BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\n\nPARENT: Emily Chen (MRN: MN-123456789)\n\nGESTATION: 37 weeks 5 days (late preterm)\n\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)\n\nVITALS: T: 36.6°C, HR: 155, RR: 58\n\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother\'s expressed colostrum via syringe, then breast/bottle as tolerated',
    department: 'Newborn',
    chartData: {
      background: 'Late preterm twin A delivered via scheduled Cesarean section, requiring NICU care.',
      summary: 'Twin A requiring transitional care for late preterm status and glucose monitoring.',
      discharge: 'Pending stable transition and feeding establishment.',
      handoff: 'Twin A in NICU for transitional care, glucose monitoring, and feeding support.'
    }
  },
  {
    id: '012456789012',
    name: 'Baby B Chen (Twin 2)',
    dob: '2025-08-27',
    age: 0,
    doseWeight: '2.8 kg',
    sex: 'Male',
    mrn: '334455667788',
    fin: '334455667788',
    admitted: '2025-08-27',
    codeStatus: 'Full Code',
    isolation: 'None',
    bed: 'NB-05',
    allergies: 'None',
    status: 'Observation',
    provider: 'Dr. Kim',
    notes: 'BIRTH: 08/27/2025 @ 09:44, Scheduled Cesarean Section (Twin B)\n\nPARENT: Emily Chen (MRN: MN-123456789)\n\nGESTATION: 37 weeks 5 days (late preterm)\n\nBIRTH DETAILS: Birth Weight 2.8 kg (6 lbs 3 oz), Length 48 cm. APGAR Scores: 8 (1 min), 9 (5 min)\n\nVITALS: T: 36.7°C, HR: 148, RR: 54\n\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother\'s expressed colostrum via syringe, then breast/bottle as tolerated',
    department: 'Newborn',
    chartData: {
      background: 'Late preterm twin B delivered via scheduled Cesarean section, requiring NICU care.',
      summary: 'Twin B requiring transitional care for late preterm status and glucose monitoring.',
      discharge: 'Pending stable transition and feeding establishment.',
      handoff: 'Twin B in NICU for transitional care, glucose monitoring, and feeding support.'
    }
  }
];

// Medicine seeding disabled to prevent old ID format conflicts  
// Use admin interface to add medicines with sequential 10000XXX format
const initialMedicines = [
  // Empty array - no auto-seeding to prevent ID conflicts
];

// All prescriptions with invalid medicine IDs have been permanently removed
// Only prescriptions referencing valid 10000xxx medicine IDs are allowed
const initialPrescriptions = [
  // Emily Chen prescriptions - keeping only valid 10000xxx medicine IDs
  { id: '7', patientId: '334455667788', medicineId: '10000009', dosage: '325 mg', periodicity: 'Every 6 hours', duration: '10 days', route: 'Oral', startDate: new Date('2025-08-27'), endDate: new Date('2025-09-05') }
  // All other prescriptions removed because they referenced invalid medicine IDs
];

const initialIntakeOutput = [
  {
    id: 'io-003',
    patientId: '223344556677',
    type: 'intake' as const,
    category: 'Oral Fluids',
    amount: 120,
    description: 'Water intake',
    recordedBy: 'Nurse Smith',
    recordedAt: '2025-09-04T09:15:00Z'
  }
];

const initialAssessments = [
  {
    id: 'assess-003',
    patientId: '223344556677',
    assessmentType: 'Fetal Heart Rate',
    score: null,
    description: 'Continuous fetal monitoring',
    findings: 'Category I tracing, baseline 140-150 bpm',
    assessedBy: 'Nurse Smith',
    assessedAt: '2025-09-04T09:45:00Z'
  }
];

const initialVitals = [
  // Maria Garcia (Induction) - Recent vitals
  {
    id: 'vitals-003',
    patientId: '223344556677',
    pulse: 85,
    temperature: '98.2',
    respirationRate: 16,
    bloodPressureSystolic: 125,
    bloodPressureDiastolic: 80,
    oxygenSaturation: 99,
    notes: 'Induction progressing, responding well to Pitocin',
    takenBy: 'Nurse Smith',
    takenAt: '2025-09-10T14:15:00Z'
  },
  {
    id: 'vitals-004',
    patientId: '223344556677',
    pulse: 82,
    temperature: '98.1',
    respirationRate: 15,
    bloodPressureSystolic: 122,
    bloodPressureDiastolic: 78,
    oxygenSaturation: 98,
    notes: 'Pre-induction baseline vitals stable',
    takenBy: 'Nurse Smith',
    takenAt: '2025-09-10T12:45:00Z'
  },
  
  // Emily Chen (Pre-operative) - Recent vitals
  {
    id: 'vitals-005',
    patientId: '334455667788',
    pulse: 78,
    temperature: '98.0',
    respirationRate: 14,
    bloodPressureSystolic: 110,
    bloodPressureDiastolic: 68,
    oxygenSaturation: 99,
    notes: 'Pre-operative vitals stable, ready for C-section',
    takenBy: 'Nurse Taylor',
    takenAt: '2025-09-10T14:00:00Z'
  },
  
  // Aisha Williams (Preterm Labor) - Recent vitals
  {
    id: 'vitals-006',
    patientId: '445566778899',
    pulse: 95,
    temperature: '98.8',
    respirationRate: 20,
    bloodPressureSystolic: 128,
    bloodPressureDiastolic: 82,
    oxygenSaturation: 97,
    notes: 'Preterm labor, on bed rest and tocolysis, monitoring closely',
    takenBy: 'Nurse Davis',
    takenAt: '2025-09-10T14:20:00Z'
  },
  {
    id: 'vitals-007',
    patientId: '445566778899',
    pulse: 98,
    temperature: '99.1',
    respirationRate: 22,
    bloodPressureSystolic: 132,
    bloodPressureDiastolic: 85,
    oxygenSaturation: 96,
    notes: 'Mild tachycardia and elevated temp, continue monitoring',
    takenBy: 'Nurse Davis',
    takenAt: '2025-09-10T13:30:00Z'
  },
  
  // Sophia Miller (Severe Preeclampsia) - Recent vitals
  {
    id: 'vitals-008',
    patientId: '556677889900',
    pulse: 102,
    temperature: '98.5',
    respirationRate: 18,
    bloodPressureSystolic: 168,
    bloodPressureDiastolic: 115,
    oxygenSaturation: 98,
    notes: 'Severe preeclampsia, BP elevated on magnesium sulfate',
    takenBy: 'Nurse Wilson',
    takenAt: '2025-09-10T14:25:00Z'
  },
  {
    id: 'vitals-009',
    patientId: '556677889900',
    pulse: 105,
    temperature: '98.7',
    respirationRate: 20,
    bloodPressureSystolic: 172,
    bloodPressureDiastolic: 118,
    oxygenSaturation: 97,
    notes: 'BP critically elevated, seizure precautions in place',
    takenBy: 'Nurse Wilson',
    takenAt: '2025-09-10T13:45:00Z'
  },
  
  // Chloe Johnson (TOLAC) - Recent vitals
  {
    id: 'vitals-010',
    patientId: '667788990011',
    pulse: 90,
    temperature: '98.3',
    respirationRate: 17,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 76,
    oxygenSaturation: 99,
    notes: 'TOLAC in progress, labor pattern strong and regular',
    takenBy: 'Nurse Brown',
    takenAt: '2025-09-10T14:10:00Z'
  },
  
  // Newborn vitals
  {
    id: 'vitals-011',
    patientId: '789123456789',
    pulse: 145,
    temperature: '98.6',
    respirationRate: 50,
    bloodPressureSystolic: 65,
    bloodPressureDiastolic: 40,
    oxygenSaturation: 98,
    notes: 'Term newborn, vitals within normal limits',
    takenBy: 'Nurse Martinez',
    takenAt: '2025-09-10T14:05:00Z'
  },
  {
    id: 'vitals-012',
    patientId: '890234567890',
    pulse: 150,
    temperature: '98.4',
    respirationRate: 48,
    bloodPressureSystolic: 68,
    bloodPressureDiastolic: 42,
    oxygenSaturation: 99,
    notes: 'Post-term newborn, large for gestational age, stable',
    takenBy: 'Nurse Rodriguez',
    takenAt: '2025-09-10T14:00:00Z'
  }
];

const initialProviderOrders = [
  // Maria Garcia orders  
  { patientId: '223344556677', orderType: 'diet', description: 'Regular diet until active labor begins', status: 'active', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T08:00:00Z') },
  { patientId: '223344556677', orderType: 'medication', description: 'Begin Pitocin infusion per protocol', status: 'active', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T08:00:00Z') },
  { patientId: '223344556677', orderType: 'procedure', description: 'Continuous fetal monitoring once Pitocin is initiated', status: 'active', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T08:00:00Z') },
  { patientId: '223344556677', orderType: 'lab', description: 'CBC, Type & Screen', status: 'active', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T08:00:00Z') },
  
  // Emily Chen orders
  { patientId: '334455667788', orderType: 'diet', description: 'NPO since midnight', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:00:00Z') },
  { patientId: '334455667788', orderType: 'medication', description: 'Pre-operative IV antibiotics (Ancef 2g). Spinal anesthesia.', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:00:00Z') },
  { patientId: '334455667788', orderType: 'procedure', description: 'Abdominal prep for C-section', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:00:00Z') },
  { patientId: '334455667788', orderType: 'lab', description: 'CBC, CMP, Type & Crossmatch 2 units PRBCs', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:00:00Z') },
  
  // Aisha Williams orders
  { patientId: '445566778899', orderType: 'activity', description: 'Strict bed rest', status: 'active', orderedBy: 'Dr. Johnson', orderedAt: new Date('2025-08-27T02:15:00Z') },
  { patientId: '445566778899', orderType: 'medication', description: 'Betamethasone 12mg IM x 2 doses, 24 hours apart', status: 'active', orderedBy: 'Dr. Johnson', orderedAt: new Date('2025-08-27T02:15:00Z') },
  { patientId: '445566778899', orderType: 'medication', description: 'Magnesium Sulfate bolus and maintenance infusion for neuroprotection', status: 'active', orderedBy: 'Dr. Johnson', orderedAt: new Date('2025-08-27T02:15:00Z') },
  { patientId: '445566778899', orderType: 'medication', description: 'Tocolysis with Nifedipine', status: 'active', orderedBy: 'Dr. Johnson', orderedAt: new Date('2025-08-27T02:15:00Z') },
  { patientId: '445566778899', orderType: 'procedure', description: 'Continuous fetal and contraction monitoring', status: 'active', orderedBy: 'Dr. Johnson', orderedAt: new Date('2025-08-27T02:15:00Z') },
  { patientId: '445566778899', orderType: 'procedure', description: 'NICU consult', status: 'active', orderedBy: 'Dr. Johnson', orderedAt: new Date('2025-08-27T02:15:00Z') },
  
  // Sophia Miller orders
  { patientId: '556677889900', orderType: 'activity', description: 'Strict bed rest, seizure precautions', status: 'active', orderedBy: 'Dr. Thompson', orderedAt: new Date('2025-08-27T10:45:00Z') },
  { patientId: '556677889900', orderType: 'diet', description: 'NPO', status: 'active', orderedBy: 'Dr. Thompson', orderedAt: new Date('2025-08-27T10:45:00Z') },
  { patientId: '556677889900', orderType: 'medication', description: 'Magnesium Sulfate bolus and maintenance infusion for seizure prophylaxis', status: 'active', orderedBy: 'Dr. Thompson', orderedAt: new Date('2025-08-27T10:45:00Z') },
  { patientId: '556677889900', orderType: 'medication', description: 'Labetalol 20mg IV push for BP > 160/110', status: 'active', orderedBy: 'Dr. Thompson', orderedAt: new Date('2025-08-27T10:45:00Z') },
  { patientId: '556677889900', orderType: 'procedure', description: 'Prepare for induction of labor', status: 'active', orderedBy: 'Dr. Thompson', orderedAt: new Date('2025-08-27T10:45:00Z') },
  { patientId: '556677889900', orderType: 'lab', description: 'CBC with platelets, LFTs, Uric Acid, Urine Protein/Creatinine Ratio', status: 'active', orderedBy: 'Dr. Thompson', orderedAt: new Date('2025-08-27T10:45:00Z') },
  
  // Chloe Johnson orders
  { patientId: '667788990011', orderType: 'activity', description: 'Ambulate as tolerated', status: 'active', orderedBy: 'Dr. Anderson', orderedAt: new Date('2025-08-27T11:15:00Z') },
  { patientId: '667788990011', orderType: 'diet', description: 'Clear liquids', status: 'active', orderedBy: 'Dr. Anderson', orderedAt: new Date('2025-08-27T11:15:00Z') },
  { patientId: '667788990011', orderType: 'procedure', description: 'Continuous fetal monitoring', status: 'active', orderedBy: 'Dr. Anderson', orderedAt: new Date('2025-08-27T11:15:00Z') },
  { patientId: '667788990011', orderType: 'medication', description: 'Saline lock. Consent for TOLAC and repeat C-section signed.', status: 'active', orderedBy: 'Dr. Anderson', orderedAt: new Date('2025-08-27T11:15:00Z') },
  { patientId: '667788990011', orderType: 'lab', description: 'Type & Screen', status: 'active', orderedBy: 'Dr. Anderson', orderedAt: new Date('2025-08-27T11:15:00Z') },
  
  // Baby Boy Smith orders
  { patientId: '789123456789', orderType: 'diet', description: 'Breastfeeding on demand', status: 'active', orderedBy: 'Dr. Martinez', orderedAt: new Date('2025-08-27T10:52:00Z') },
  { patientId: '789123456789', orderType: 'medication', description: 'Vitamin K 1mg IM', status: 'completed', orderedBy: 'Dr. Martinez', orderedAt: new Date('2025-08-27T10:52:00Z') },
  { patientId: '789123456789', orderType: 'medication', description: 'Erythromycin eye ointment', status: 'completed', orderedBy: 'Dr. Martinez', orderedAt: new Date('2025-08-27T10:52:00Z') },
  { patientId: '789123456789', orderType: 'procedure', description: 'Newborn screen at 24 hours of age', status: 'pending', orderedBy: 'Dr. Martinez', orderedAt: new Date('2025-08-27T10:52:00Z') },
  { patientId: '789123456789', orderType: 'procedure', description: 'Hearing screen at 24 hours of age', status: 'pending', orderedBy: 'Dr. Martinez', orderedAt: new Date('2025-08-27T10:52:00Z') },
  { patientId: '789123456789', orderType: 'procedure', description: 'CCHD screen at 24 hours of age', status: 'pending', orderedBy: 'Dr. Martinez', orderedAt: new Date('2025-08-27T10:52:00Z') },
  
  // Baby Girl Garcia orders
  { patientId: '890234567890', orderType: 'diet', description: 'Formula feeding, 1-2 oz every 3-4 hours', status: 'active', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T11:01:00Z') },
  { patientId: '890234567890', orderType: 'medication', description: 'Vitamin K 1mg IM', status: 'completed', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T11:01:00Z') },
  { patientId: '890234567890', orderType: 'medication', description: 'Erythromycin eye ointment', status: 'completed', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T11:01:00Z') },
  { patientId: '890234567890', orderType: 'lab', description: 'Blood glucose check before first three feeds due to large size', status: 'active', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T11:01:00Z') },
  { patientId: '890234567890', orderType: 'procedure', description: 'Newborn screen at 24 hours of age', status: 'pending', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T11:01:00Z') },
  { patientId: '890234567890', orderType: 'procedure', description: 'Hearing screen at 24 hours of age', status: 'pending', orderedBy: 'Dr. Rodriguez', orderedAt: new Date('2025-08-27T11:01:00Z') },
  
  // Baby A Chen (Twin 1) orders
  { patientId: '901345678901', orderType: 'activity', description: 'NICU transitional care', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:42:00Z') },
  { patientId: '901345678901', orderType: 'diet', description: 'Mother\'s expressed colostrum via syringe, then breast/bottle as tolerated', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:42:00Z') },
  { patientId: '901345678901', orderType: 'medication', description: 'Vitamin K 1mg IM', status: 'completed', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:42:00Z') },
  { patientId: '901345678901', orderType: 'medication', description: 'Erythromycin eye ointment', status: 'completed', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:42:00Z') },
  { patientId: '901345678901', orderType: 'lab', description: 'Glucose monitoring per twin protocol', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:42:00Z') },
  { patientId: '901345678901', orderType: 'procedure', description: 'NICU assessment and monitoring', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:42:00Z') },
  
  // Baby B Chen (Twin 2) orders
  { patientId: '012456789012', orderType: 'activity', description: 'NICU transitional care', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:44:00Z') },
  { patientId: '012456789012', orderType: 'diet', description: 'Mother\'s expressed colostrum via syringe, then breast/bottle as tolerated', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:44:00Z') },
  { patientId: '012456789012', orderType: 'medication', description: 'Vitamin K 1mg IM', status: 'completed', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:44:00Z') },
  { patientId: '012456789012', orderType: 'medication', description: 'Erythromycin eye ointment', status: 'completed', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:44:00Z') },
  { patientId: '012456789012', orderType: 'lab', description: 'Glucose monitoring per twin protocol', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:44:00Z') },
  { patientId: '012456789012', orderType: 'procedure', description: 'NICU assessment and monitoring', status: 'active', orderedBy: 'Dr. Kim', orderedAt: new Date('2025-08-27T09:44:00Z') }
];

const initialLabTestTypes = [
  { code: 'CBC-HGB', name: 'Complete Blood Count - Hemoglobin', category: 'Hematology', unit: 'g/dL', referenceRange: '12.0-16.0 g/dL', isActive: 1 },
  { code: 'CBC-WBC', name: 'Complete Blood Count - White Blood Cells', category: 'Hematology', unit: 'cells/μL', referenceRange: '4500-11000 cells/μL', isActive: 1 },
  { code: 'BMP-GLU', name: 'Basic Metabolic Panel - Glucose', category: 'Chemistry', unit: 'mg/dL', referenceRange: '70-100 mg/dL', isActive: 1 },
  { code: 'BMP-CREAT', name: 'Basic Metabolic Panel - Creatinine', category: 'Chemistry', unit: 'mg/dL', referenceRange: '0.6-1.2 mg/dL', isActive: 1 },
  { code: 'BMP-BUN', name: 'Basic Metabolic Panel - Blood Urea Nitrogen', category: 'Chemistry', unit: 'mg/dL', referenceRange: '6-20 mg/dL', isActive: 1 },
  { code: 'HbA1c', name: 'Hemoglobin A1C', category: 'Endocrinology', unit: '%', referenceRange: '<7.0%', isActive: 1 },
  { code: 'LIPID-CHOL', name: 'Lipid Panel - Total Cholesterol', category: 'Chemistry', unit: 'mg/dL', referenceRange: '<200 mg/dL', isActive: 1 },
  { code: 'LIPID-LDL', name: 'Lipid Panel - LDL Cholesterol', category: 'Chemistry', unit: 'mg/dL', referenceRange: '<100 mg/dL', isActive: 1 },
  { code: 'LIPID-HDL', name: 'Lipid Panel - HDL Cholesterol', category: 'Chemistry', unit: 'mg/dL', referenceRange: '>40 mg/dL (M), >50 mg/dL (F)', isActive: 1 },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone', category: 'Endocrinology', unit: 'mIU/L', referenceRange: '0.4-4.0 mIU/L', isActive: 1 },
  { code: 'PSA', name: 'Prostate Specific Antigen', category: 'Endocrinology', unit: 'ng/mL', referenceRange: '<4.0 ng/mL', isActive: 1 }
];

const initialLabResults = [
  
  // Recent labs for Marcus Thompson
  {
    patientId: '223344556677',
    testName: 'Lipid Panel - Total Cholesterol',
    testCode: 'LIPID-CHOL',
    value: '220',
    unit: 'mg/dL',
    referenceRange: '<200 mg/dL',
    status: 'abnormal',
    takenAt: new Date('2025-08-24T10:30:00Z'),
    resultedAt: new Date('2025-08-24T15:00:00Z'),
    notes: 'Elevated cholesterol, recommend dietary changes'
  },
  {
    patientId: '223344556677',
    testName: 'Lipid Panel - LDL Cholesterol',
    testCode: 'LIPID-LDL',
    value: '145',
    unit: 'mg/dL',
    referenceRange: '<100 mg/dL',
    status: 'abnormal',
    takenAt: new Date('2025-08-24T10:30:00Z'),
    resultedAt: new Date('2025-08-24T15:00:00Z'),
    notes: 'LDL elevated'
  },
  {
    patientId: '223344556677',
    testName: 'Lipid Panel - HDL Cholesterol',
    testCode: 'LIPID-HDL',
    value: '38',
    unit: 'mg/dL',
    referenceRange: '>40 mg/dL (M), >50 mg/dL (F)',
    status: 'abnormal',
    takenAt: new Date('2025-08-24T10:30:00Z'),
    resultedAt: new Date('2025-08-24T15:00:00Z'),
    notes: 'HDL low, consider exercise'
  },
  {
    patientId: '223344556677',
    testName: 'Thyroid Stimulating Hormone',
    testCode: 'TSH',
    value: '2.1',
    unit: 'mIU/L',
    referenceRange: '0.4-4.0 mIU/L',
    status: 'normal',
    takenAt: new Date('2025-08-24T10:30:00Z'),
    resultedAt: new Date('2025-08-24T16:30:00Z'),
    notes: 'Thyroid function normal'
  },
  {
    patientId: '223344556677',
    testName: 'Prostate Specific Antigen',
    testCode: 'PSA',
    value: '1.8',
    unit: 'ng/mL',
    referenceRange: '<4.0 ng/mL',
    status: 'normal',
    takenAt: new Date('2025-08-22T08:00:00Z'),
    resultedAt: new Date('2025-08-22T14:00:00Z'),
    notes: 'Annual screening - normal'
  }
];

export async function seedDatabase() {
  try {
    console.log("🌱 Seeding database...");
    console.log("🗑️  Clearing existing data for fresh seed...");
    
    // Always clear and reseed for consistent deployments
    // Delete in correct order to avoid foreign key constraints
    await db.delete(administrations);
    await db.delete(prescriptions);
    await db.delete(providerOrders);
    await db.delete(labResults);
    await db.delete(labTestTypes);
    await db.delete(imagingFiles);
    await db.delete(intakeOutput);
    await db.delete(assessments);
    await db.delete(sessions);
    await db.delete(patients);
    await db.delete(medicines);
    await db.delete(users);
    
    console.log("✅ Database cleared, reseeding with fresh data...");
    
    // Insert patients
    await db.insert(patients).values(initialPatients).onConflictDoNothing();
    
    // Insert medicines
    console.log(`🔄 Inserting ${initialMedicines.length} medicines...`);
    await db.insert(medicines).values(initialMedicines).onConflictDoNothing();
    
    // Insert prescriptions
    await db.insert(prescriptions).values(initialPrescriptions).onConflictDoNothing();
    
    // Insert lab test types
    await db.insert(labTestTypes).values(initialLabTestTypes).onConflictDoNothing();
    
    // Insert lab results
    await db.insert(labResults).values(initialLabResults).onConflictDoNothing();
    
    // Insert provider orders
    await db.insert(providerOrders).values(initialProviderOrders).onConflictDoNothing();
    
    // Insert intake/output records
    await db.insert(intakeOutput).values(initialIntakeOutput).onConflictDoNothing();
    
    // Insert assessments
    await db.insert(assessments).values(initialAssessments).onConflictDoNothing();
    
    // Insert vitals
    console.log(`🔄 Inserting ${initialVitals.length} vitals records...`);
    await db.insert(vitals).values(initialVitals).onConflictDoNothing();
    
    console.log("✅ Database seeded successfully!");
    
    // Test the calculateTotalDoses function to verify our fixes
    const { testCalculateTotalDoses } = await import('./storage');
    testCalculateTotalDoses();
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}