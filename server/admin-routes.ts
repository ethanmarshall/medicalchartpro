import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { 
  users, 
  patients, 
  medicines, 
  labTestTypes, 
  imagingFiles,
  prescriptions,
  administrations,
  vitals,
  careNotes,
  providerOrders,
  intakeOutput,
  assessments,
  carePlans,
  labResults,
  auditLogs,
  sessions,
  insertPatientSchema,
  medicationLinks,
  protocolInstances,
  insertMedicationLinksSchema,
  insertProtocolInstancesSchema
} from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Generic CRUD operations for admin dashboard

// Users CRUD
router.get('/users', async (req, res) => {
  try {
    const result = await db.select().from(users);
    res.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const userData = { ...req.body, id: randomUUID() };
    const result = await db.insert(users).values(userData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const result = await db.update(users)
      .set(req.body)
      .where(eq(users.id, req.params.id))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await db.delete(users).where(eq(users.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Patients CRUD
router.get('/patients', async (req, res) => {
  try {
    const result = await db.select().from(patients);
    res.json(result);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get next available bed for a department
router.get('/next-bed/:department', async (req, res) => {
  try {
    const department = req.params.department;
    
    // Define bed prefixes for each department
    const bedPrefixes: { [key: string]: string } = {
      'Newborn': 'NB-',
      'Labor & Delivery': 'LD-',
      'ICU': 'ICU-',
      'Emergency': 'ER-',
      'Surgery': 'SURG-',
      'Pediatrics': 'PEDS-',
      'Cardiology': 'CARD-',
      'Oncology': 'ONC-',
      'Postpartum': 'PP-',
      'Medical': 'MED-',
      'Surgical': 'SURG-',
      'Obstetrics': 'OB-',
      'NICU': 'NICU-'
    };

    const prefix = bedPrefixes[department];
    if (!prefix) {
      return res.status(400).json({ error: 'Invalid department' });
    }

    // Get all existing patients with beds that match this department's prefix
    const existingPatients = await db.select().from(patients);
    const departmentBeds = existingPatients
      .filter(patient => patient.bed && patient.bed.startsWith(prefix))
      .map(patient => patient.bed)
      .map(bed => {
        // Extract the number from the bed (e.g., "NB-101" -> 101)
        const match = bed.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0)
      .sort((a, b) => a - b);

    // Find the next available bed number
    let nextBedNumber = 101; // Start at 101 for all departments
    for (const bedNum of departmentBeds) {
      if (bedNum === nextBedNumber) {
        nextBedNumber++;
      } else if (bedNum > nextBedNumber) {
        break;
      }
    }

    const nextBed = `${prefix}${nextBedNumber.toString().padStart(3, '0')}`;
    res.json({ bed: nextBed });
  } catch (error) {
    console.error('Error getting next available bed:', error);
    res.status(500).json({ error: 'Failed to get next available bed' });
  }
});

router.post('/patients', async (req, res) => {
  try {
    const validatedData = insertPatientSchema.parse({
      ...req.body,
      id: req.body.id || randomUUID(),
    });
    
    const patientData = { 
      ...validatedData, 
      chartData: req.body.chartData ? JSON.stringify(req.body.chartData) : null
    };
    const result = await db.insert(patients).values(patientData).returning();
    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
    }
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

router.put('/patients/:id', async (req, res) => {
  console.log('🔥 ADMIN PATIENT UPDATE ROUTE HIT - ID:', req.params.id);
  console.log('🔥 RAW REQUEST BODY:', JSON.stringify(req.body, null, 2));
  
  try {
    // Whitelist only valid patient fields - exclude any timestamp fields
    const updateData = {
      name: req.body.name,
      dob: req.body.dob,
      age: Number(req.body.age) || 0,
      doseWeight: req.body.doseWeight,
      sex: req.body.sex,
      mrn: req.body.mrn,
      fin: req.body.fin,
      admitted: req.body.admitted,
      isolation: req.body.isolation,
      bed: req.body.bed,
      allergies: req.body.allergies,
      status: req.body.status,
      provider: req.body.provider,
      notes: req.body.notes,
      department: req.body.department,
      chartData: req.body.chartData ? JSON.stringify(req.body.chartData) : req.body.chartData
    };
    
    console.log('🔥 WHITELISTED UPDATE DATA:', JSON.stringify(updateData, null, 2));
    
    const result = await db.update(patients)
      .set(updateData)
      .where(eq(patients.id, req.params.id))
      .returning();
      
    console.log('🔥 UPDATE SUCCESS:', result[0]);
    res.json(result[0]);
  } catch (error) {
    console.error('🔥 ERROR updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

router.delete('/patients/:id', async (req, res) => {
  try {
    // Delete related records first (due to foreign key constraints)
    // Delete protocol instances first (they reference prescriptions)
    await db.delete(protocolInstances).where(eq(protocolInstances.patientId, req.params.id));
    await db.delete(prescriptions).where(eq(prescriptions.patientId, req.params.id));
    await db.delete(administrations).where(eq(administrations.patientId, req.params.id));
    await db.delete(vitals).where(eq(vitals.patientId, req.params.id));
    await db.delete(careNotes).where(eq(careNotes.patientId, req.params.id));
    await db.delete(labResults).where(eq(labResults.patientId, req.params.id));
    await db.delete(imagingFiles).where(eq(imagingFiles.patientId, req.params.id));
    await db.delete(carePlans).where(eq(carePlans.patientId, req.params.id));
    await db.delete(providerOrders).where(eq(providerOrders.patientId, req.params.id));
    await db.delete(intakeOutput).where(eq(intakeOutput.patientId, req.params.id));
    await db.delete(assessments).where(eq(assessments.patientId, req.params.id));
    
    // Finally delete the patient
    await db.delete(patients).where(eq(patients.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Medicines CRUD
router.get('/medicines', async (req, res) => {
  try {
    const result = await db.select().from(medicines);
    
    // Log first few medicines for debugging
    console.log('MEDICINES GET: Returning', result.length, 'medicines');
    console.log('MEDICINES SAMPLE:', result.slice(0, 3).map(m => ({ id: m.id, name: m.name })));
    
    // Log Acetaminophen entries specifically
    const acetaminophen = result.filter(m => m.name === 'Acetaminophen').slice(0, 3);
    console.log('ACETAMINOPHEN IDs being sent:', acetaminophen.map(m => ({ id: m.id, name: m.name })));
    
    // Disable caching to ensure fresh data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
});


router.post('/medicines', async (req, res) => {
  try {
    // Remove any manually provided ID for new medicines
    const { id, ...medicineData } = req.body;
    
    // Auto-generate next sequential medicine ID
    const existingMedicines = await db.select({ id: medicines.id }).from(medicines);
    
    // Find highest numeric medicine ID (format: 10000001, 10000002, etc.)
    let maxId = 10000000; // Starting base
    existingMedicines.forEach(med => {
      const numericPart = parseInt(med.id);
      if (!isNaN(numericPart) && numericPart > maxId) {
        maxId = numericPart;
      }
    });
    
    const nextId = (maxId + 1).toString();
    console.log('🆔 MEDICINE CREATE: Auto-generated ID:', nextId, `(previous highest: ${maxId})`);
    
    const fullMedicineData = { ...medicineData, id: nextId };
    const result = await db.insert(medicines).values(fullMedicineData).returning();
    
    console.log('✅ MEDICINE CREATED:', result[0]);
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating medicine:', error);
    res.status(500).json({ error: 'Failed to create medicine' });
  }
});

router.put('/medicines/:id', async (req, res) => {
  try {
    console.log('PUT /medicines/:id - Request received for ID:', req.params.id);
    console.log('PUT /medicines/:id - Request body:', req.body);
    
    // Validate ID mismatch (debugging)
    if (req.body.id && req.body.id !== req.params.id) {
      console.log('⚠️  ID MISMATCH: Path param:', req.params.id, 'vs Body ID:', req.body.id);
    }
    
    // Remove id from update payload to prevent primary key update
    const { id, ...updateData } = req.body;
    console.log('PUT /medicines/:id - Update data (ID removed):', updateData);
    
    const result = await db.update(medicines)
      .set(updateData)
      .where(eq(medicines.id, req.params.id))
      .returning();
    
    console.log('PUT /medicines/:id - Update result:', result);
    
    if (!result || result.length === 0) {
      console.log('PUT /medicines/:id - No medicine found, returning 404');
      return res.status(404).json({ error: 'Medicine not found' });
    }
    
    console.log('PUT /medicines/:id - Returning success with:', result[0]);
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating medicine:', error);
    res.status(500).json({ error: 'Failed to update medicine' });
  }
});

router.delete('/medicines/:id', async (req, res) => {
  try {
    // Delete related prescriptions first
    await db.delete(prescriptions).where(eq(prescriptions.medicineId, req.params.id));
    await db.delete(administrations).where(eq(administrations.medicineId, req.params.id));
    
    await db.delete(medicines).where(eq(medicines.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    res.status(500).json({ error: 'Failed to delete medicine' });
  }
});

// Prescriptions CRUD
router.get('/prescriptions', async (req, res) => {
  try {
    const result = await db.select().from(prescriptions);
    res.json(result);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

router.post('/prescriptions', async (req, res) => {
  try {
    const prescriptionData = { ...req.body, id: randomUUID() };
    const result = await db.insert(prescriptions).values(prescriptionData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

router.put('/prescriptions/:id', async (req, res) => {
  try {
    const result = await db.update(prescriptions)
      .set(req.body)
      .where(eq(prescriptions.id, req.params.id))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({ error: 'Failed to update prescription' });
  }
});

router.delete('/prescriptions/:id', async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    
    // First, delete any protocol instances that reference this prescription
    // (either as trigger or follow prescription)
    await db.delete(protocolInstances).where(
      or(
        eq(protocolInstances.triggerPrescriptionId, prescriptionId),
        eq(protocolInstances.followPrescriptionId, prescriptionId)
      )
    );
    
    // Then delete the prescription itself
    await db.delete(prescriptions).where(eq(prescriptions.id, prescriptionId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    res.status(500).json({ error: 'Failed to delete prescription' });
  }
});

// Vitals CRUD
router.get('/vitals', async (req, res) => {
  try {
    const result = await db.select().from(vitals);
    res.json(result);
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ error: 'Failed to fetch vitals' });
  }
});

router.post('/vitals', async (req, res) => {
  try {
    const vitalData = { ...req.body, id: randomUUID() };
    const result = await db.insert(vitals).values(vitalData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating vital:', error);
    res.status(500).json({ error: 'Failed to create vital' });
  }
});

router.put('/vitals/:id', async (req, res) => {
  try {
    const result = await db.update(vitals)
      .set(req.body)
      .where(eq(vitals.id, req.params.id))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating vital:', error);
    res.status(500).json({ error: 'Failed to update vital' });
  }
});

router.delete('/vitals/:id', async (req, res) => {
  try {
    await db.delete(vitals).where(eq(vitals.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vital:', error);
    res.status(500).json({ error: 'Failed to delete vital' });
  }
});

// Lab Results CRUD
router.get('/lab-results', async (req, res) => {
  try {
    const result = await db.select().from(labResults);
    res.json(result);
  } catch (error) {
    console.error('Error fetching lab results:', error);
    res.status(500).json({ error: 'Failed to fetch lab results' });
  }
});

router.post('/lab-results', async (req, res) => {
  try {
    const labResultData = { ...req.body, id: randomUUID() };
    const result = await db.insert(labResults).values(labResultData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating lab result:', error);
    res.status(500).json({ error: 'Failed to create lab result' });
  }
});

router.put('/lab-results/:id', async (req, res) => {
  try {
    const result = await db.update(labResults)
      .set(req.body)
      .where(eq(labResults.id, req.params.id))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating lab result:', error);
    res.status(500).json({ error: 'Failed to update lab result' });
  }
});

router.delete('/lab-results/:id', async (req, res) => {
  try {
    await db.delete(labResults).where(eq(labResults.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lab result:', error);
    res.status(500).json({ error: 'Failed to delete lab result' });
  }
});

// Care Notes CRUD
router.get('/care-notes', async (req, res) => {
  try {
    const result = await db.select().from(careNotes);
    res.json(result);
  } catch (error) {
    console.error('Error fetching care notes:', error);
    res.status(500).json({ error: 'Failed to fetch care notes' });
  }
});

router.post('/care-notes', async (req, res) => {
  try {
    const careNoteData = { ...req.body, id: randomUUID() };
    const result = await db.insert(careNotes).values(careNoteData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating care note:', error);
    res.status(500).json({ error: 'Failed to create care note' });
  }
});

router.put('/care-notes/:id', async (req, res) => {
  try {
    const result = await db.update(careNotes)
      .set(req.body)
      .where(eq(careNotes.id, req.params.id))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating care note:', error);
    res.status(500).json({ error: 'Failed to update care note' });
  }
});

router.delete('/care-notes/:id', async (req, res) => {
  try {
    await db.delete(careNotes).where(eq(careNotes.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting care note:', error);
    res.status(500).json({ error: 'Failed to delete care note' });
  }
});

// Administrations CRUD
router.get('/administrations', async (req, res) => {
  try {
    const result = await db.select().from(administrations);
    res.json(result);
  } catch (error) {
    console.error('Error fetching administrations:', error);
    res.status(500).json({ error: 'Failed to fetch administrations' });
  }
});

// REMOVED: Duplicate administration handler - now handled in main routes with proper protocol validation

router.put('/administrations/:id', async (req, res) => {
  try {
    const result = await db.update(administrations)
      .set(req.body)
      .where(eq(administrations.id, req.params.id))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating administration:', error);
    res.status(500).json({ error: 'Failed to update administration' });
  }
});

router.delete('/administrations/:id', async (req, res) => {
  try {
    await db.delete(administrations).where(eq(administrations.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting administration:', error);
    res.status(500).json({ error: 'Failed to delete administration' });
  }
});

// Lab Test Types CRUD
router.get('/lab-test-types', async (req, res) => {
  try {
    const result = await db.select().from(labTestTypes);
    res.json(result);
  } catch (error) {
    console.error('Error fetching lab test types:', error);
    res.status(500).json({ error: 'Failed to fetch lab test types' });
  }
});

router.post('/lab-test-types', async (req, res) => {
  try {
    const labTestData = { ...req.body, id: randomUUID() };
    const result = await db.insert(labTestTypes).values(labTestData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating lab test type:', error);
    res.status(500).json({ error: 'Failed to create lab test type' });
  }
});

router.put('/lab-test-types/:id', async (req, res) => {
  try {
    const result = await db.update(labTestTypes)
      .set(req.body)
      .where(eq(labTestTypes.id, req.params.id))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating lab test type:', error);
    res.status(500).json({ error: 'Failed to update lab test type' });
  }
});

router.delete('/lab-test-types/:id', async (req, res) => {
  try {
    await db.delete(labTestTypes).where(eq(labTestTypes.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lab test type:', error);
    res.status(500).json({ error: 'Failed to delete lab test type' });
  }
});

// Image upload configuration
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${randomUUID()}.${file.originalname.split('.').pop()}`;
    cb(null, uniqueName);
  }
});

const imageUpload = multer({ 
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Imaging Results CRUD
router.get('/imaging-results', async (req, res) => {
  try {
    const result = await db.select().from(imagingFiles);
    res.json(result);
  } catch (error) {
    console.error('Error fetching imaging results:', error);
    res.status(500).json({ error: 'Failed to fetch imaging results' });
  }
});

router.post('/imaging-results', imageUpload.single('imageFile'), async (req, res) => {
  try {
    const imagingData = { 
      ...req.body, 
      id: randomUUID(),
      studyDate: req.body.studyDate || new Date().toISOString(),
      imageUrl: req.file ? `/uploads/images/${req.file.filename}` : null
    };
    console.log('Creating imaging entry with data:', imagingData);
    const result = await db.insert(imagingFiles).values(imagingData).returning();
    console.log('Successfully created imaging entry:', result[0]);
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating imaging result:', error);
    res.status(500).json({ error: 'Failed to create imaging result' });
  }
});

router.put('/imaging-results/:id', imageUpload.single('imageFile'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.imageUrl = `/uploads/images/${req.file.filename}`;
    }
    
    const result = await db.update(imagingFiles)
      .set(updateData)
      .where(eq(imagingFiles.id, req.params.id))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating imaging result:', error);
    res.status(500).json({ error: 'Failed to update imaging result' });
  }
});

router.delete('/imaging-results/:id', async (req, res) => {
  try {
    // First get the record to delete the image file
    const record = await db.select().from(imagingFiles).where(eq(imagingFiles.id, req.params.id));
    
    if (record[0] && record[0].imageUrl) {
      const imagePath = path.join(process.cwd(), record[0].imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await db.delete(imagingFiles).where(eq(imagingFiles.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting imaging result:', error);
    res.status(500).json({ error: 'Failed to delete imaging result' });
  }
});

// Database Import/Export - PostgreSQL JSON Format
router.get('/export', async (req, res) => {
  try {
    // Export all database tables as JSON
    const exportData = {
      patients: await db.select().from(patients),
      medicines: await db.select().from(medicines),
      prescriptions: await db.select().from(prescriptions),
      administrations: await db.select().from(administrations),
      users: await db.select().from(users),
      labTestTypes: await db.select().from(labTestTypes),
      labResults: await db.select().from(labResults),
      vitals: await db.select().from(vitals),
      careNotes: await db.select().from(careNotes),
      providerOrders: await db.select().from(providerOrders),
      intakeOutput: await db.select().from(intakeOutput),
      assessments: await db.select().from(assessments),
      imagingFiles: await db.select().from(imagingFiles),
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="medchart-database.json"');
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting database:', error);
    res.status(500).json({ error: 'Failed to export database' });
  }
});

router.post('/import', upload.single('database'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No database file provided' });
    }

    const uploadPath = req.file.path;
    
    // Read and parse the JSON file
    const fileContent = fs.readFileSync(uploadPath, 'utf8');
    const importData = JSON.parse(fileContent);
    
    // Validate import data structure
    if (!importData.patients || !importData.medicines) {
      throw new Error('Invalid database format - missing required tables');
    }

    // Create backup by exporting current data
    const backupData = {
      patients: await db.select().from(patients),
      medicines: await db.select().from(medicines),
      prescriptions: await db.select().from(prescriptions),
      administrations: await db.select().from(administrations),
      users: await db.select().from(users),
      labTestTypes: await db.select().from(labTestTypes),
      labResults: await db.select().from(labResults),
      vitals: await db.select().from(vitals),
      careNotes: await db.select().from(careNotes),
      providerOrders: await db.select().from(providerOrders),
      intakeOutput: await db.select().from(intakeOutput),
      assessments: await db.select().from(assessments),
      imagingFiles: await db.select().from(imagingFiles),
      backedUpAt: new Date().toISOString()
    };
    
    const backupPath = path.join(process.cwd(), `database-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    // Clear existing data (preserve sessions and some critical tables)
    await db.delete(administrations);
    await db.delete(prescriptions);
    await db.delete(labResults);
    await db.delete(vitals);
    await db.delete(careNotes);
    await db.delete(providerOrders);
    await db.delete(intakeOutput);
    await db.delete(assessments);
    await db.delete(imagingFiles);
    await db.delete(patients);
    await db.delete(medicines);
    await db.delete(labTestTypes);
    // Note: Not deleting users and sessions to preserve login functionality

    // Import new data
    if (importData.patients?.length > 0) {
      await db.insert(patients).values(importData.patients);
    }
    if (importData.medicines?.length > 0) {
      await db.insert(medicines).values(importData.medicines);
    }
    if (importData.prescriptions?.length > 0) {
      await db.insert(prescriptions).values(importData.prescriptions);
    }
    if (importData.administrations?.length > 0) {
      await db.insert(administrations).values(importData.administrations);
    }
    if (importData.labTestTypes?.length > 0) {
      await db.insert(labTestTypes).values(importData.labTestTypes);
    }
    if (importData.labResults?.length > 0) {
      await db.insert(labResults).values(importData.labResults);
    }
    if (importData.vitals?.length > 0) {
      await db.insert(vitals).values(importData.vitals);
    }
    if (importData.careNotes?.length > 0) {
      await db.insert(careNotes).values(importData.careNotes);
    }
    if (importData.providerOrders?.length > 0) {
      await db.insert(providerOrders).values(importData.providerOrders);
    }
    if (importData.intakeOutput?.length > 0) {
      await db.insert(intakeOutput).values(importData.intakeOutput);
    }
    if (importData.assessments?.length > 0) {
      await db.insert(assessments).values(importData.assessments);
    }
    if (importData.imagingFiles?.length > 0) {
      await db.insert(imagingFiles).values(importData.imagingFiles);
    }
    
    // Clean up uploaded file
    fs.unlinkSync(uploadPath);

    res.json({ 
      success: true, 
      message: 'Database imported successfully from JSON format',
      backup: backupPath,
      imported: {
        patients: importData.patients?.length || 0,
        medicines: importData.medicines?.length || 0,
        prescriptions: importData.prescriptions?.length || 0,
        administrations: importData.administrations?.length || 0
      }
    });
  } catch (error) {
    console.error('Error importing database:', error);
    res.status(500).json({ error: `Failed to import database: ${(error as Error).message}` });
  }
});

// Medication Links CRUD
router.get('/medication-links', async (req, res) => {
  try {
    const result = await db.select().from(medicationLinks);
    res.json(result);
  } catch (error) {
    console.error('Error fetching medication links:', error);
    res.status(500).json({ error: 'Failed to fetch medication links' });
  }
});

router.post('/medication-links', async (req, res) => {
  try {
    const validatedData = insertMedicationLinksSchema.parse(req.body);
    const linkData = {
      ...validatedData,
      id: randomUUID()
    };
    const result = await db.insert(medicationLinks).values(linkData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating medication link:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create medication link' });
    }
  }
});

router.put('/medication-links/:id', async (req, res) => {
  try {
    const updates = insertMedicationLinksSchema.partial().parse(req.body);
    const result = await db.update(medicationLinks)
      .set(updates)
      .where(eq(medicationLinks.id, req.params.id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Medication link not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating medication link:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update medication link' });
    }
  }
});

router.delete('/medication-links/:id', async (req, res) => {
  try {
    // Check if any protocol instances use this link
    const existingInstances = await db.select()
      .from(protocolInstances)
      .where(eq(protocolInstances.linkId, req.params.id));
    
    if (existingInstances.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete medication link with existing protocol instances',
        activeInstances: existingInstances.length 
      });
    }
    
    const result = await db.delete(medicationLinks)
      .where(eq(medicationLinks.id, req.params.id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Medication link not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting medication link:', error);
    res.status(500).json({ error: 'Failed to delete medication link' });
  }
});

// Protocol Instances CRUD
router.get('/protocol-instances', async (req, res) => {
  try {
    const result = await db.select().from(protocolInstances);
    res.json(result);
  } catch (error) {
    console.error('Error fetching protocol instances:', error);
    res.status(500).json({ error: 'Failed to fetch protocol instances' });
  }
});

router.post('/protocol-instances', async (req, res) => {
  try {
    const validatedData = insertProtocolInstancesSchema.parse(req.body);
    const instanceData = {
      ...validatedData,
      id: randomUUID()
    };
    const result = await db.insert(protocolInstances).values(instanceData).returning();
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating protocol instance:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create protocol instance' });
    }
  }
});

export default router;