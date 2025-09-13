import type { Express } from "express";
import { createServer, type Server } from "http";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users, medicines, sessions } from "@shared/schema";
import { storage } from "./storage";
import { reminderService } from "./reminder-service";
import { timeSimulation } from "./time-simulation";
import { insertPatientSchema, insertAdministrationSchema, insertPrescriptionSchema, insertMedicineSchema, insertLabTestTypeSchema, insertVitalsSchema, imagingFiles, type InsertAdministration } from "@shared/schema";
import { z } from "zod";
import multer from 'multer';
import { randomUUID } from 'crypto';
import path from 'path';
import * as XLSX from 'xlsx';
import session from "express-session";
import adminRoutes from "./admin-routes";
import express from "express";

// Middleware to check authentication
const requireAuth = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.authToken;
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Query sessions using Drizzle ORM
    const sessionResults = await db.select().from(sessions).where(eq(sessions.token, token));

    if (sessionResults.length === 0) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const session = sessionResults[0];
    
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ message: "Session expired" });
    }

    // Query users using Drizzle ORM
    const userResults = await db.select().from(users).where(eq(users.id, session.userId));

    if (userResults.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = userResults[0];
    req.session.authToken = token;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

// Helper function to seed default users
const seedUsers = async () => {
  try {
    // Check if users already exist
    const existingInstructor = await storage.getUserByUsername("instructor");
    if (!existingInstructor) {
      await storage.createUser({
        username: "instructor",
        pin: "112794",
        role: "instructor"
      });
      console.log("👤 Created instructor user (Username: instructor, PIN: 112794)");
    }

    const existingStudent1 = await storage.getUserByUsername("student1");
    if (!existingStudent1) {
      await storage.createUser({
        username: "student1",
        pin: "112233",
        role: "student"
      });
      console.log("👤 Created student1 user (Username: student1, PIN: 112233)");
    }

    const existingStudent2 = await storage.getUserByUsername("student2");
    if (!existingStudent2) {
      await storage.createUser({
        username: "student2",
        pin: "112234",
        role: "student"
      });
      console.log("👤 Created student2 user (Username: student2, PIN: 112234)");
    }

    // Check for admin user (no username, PIN only)
    const existingAdmin = await storage.getUserByPin("0000");
    if (!existingAdmin) {
      await storage.createUser({
        username: "a",
        pin: "0000",
        role: "admin"
      });
      console.log("👤 Created admin user (Username: a, PIN: 0000)");
    }
  } catch (error) {
    console.error("Error seeding users:", error);
  }
};

// Helper function to activate medication protocols after administration
const activateProtocols = async (administration: any, userId?: string) => {
  try {
    // Get all protocol instances for this patient
    const protocolInstances = await storage.getProtocolInstancesByPatient(administration.patientId);
    
    // Filter for protocols that haven't been activated yet and match the trigger prescription
    const toActivate = protocolInstances.filter(instance => 
      !instance.activatedAt && 
      instance.triggerPrescriptionId === administration.prescriptionId
    );
    
    if (toActivate.length === 0) {
      return; // No protocols to activate
    }
    
    // Fetch medication links once before the loop for efficiency
    const allLinks = await storage.getAllMedicationLinks();
    
    // Use administration timestamp as anchor time instead of current time
    const anchorTime = new Date(administration.administeredAt || administration.createdAt || Date.now());
    const currentTime = new Date();
    
    // Activate each matching protocol
    for (const protocolInstance of toActivate) {
      try {
        // Find the medication link for this protocol
        const link = allLinks.find(l => l.id === protocolInstance.linkId);
        
        if (!link) {
          console.error(`Medication link ${protocolInstance.linkId} not found`);
          continue;
        }
        
        // Calculate start and end times for follow-up prescription based on administration time
        const startTime = new Date(anchorTime.getTime() + (link.delayMinutes * 60 * 1000)); // Add delay
        const endTime = new Date(startTime.getTime() + (link.followDurationHours * 60 * 60 * 1000)); // Add duration
        
        // Update the follow-up prescription with start and end times (pass Date objects)
        await storage.updatePrescription(protocolInstance.followPrescriptionId, {
          startDate: startTime,
          endDate: endTime
        });
        
        // Mark the protocol instance as activated (pass Date object)
        await storage.updateProtocolInstance(protocolInstance.id, {
          activatedAt: currentTime
        });
        
        console.log(`✅ Protocol activated: ${protocolInstance.id} for patient ${administration.patientId}`);
        
        // Create audit log for protocol activation with userId if available
        const auditLogData: any = {
          entityType: 'protocol_instance',
          entityId: protocolInstance.id,
          action: 'activate',
          changes: {
            triggerAdministrationId: administration.id,
            followPrescriptionActivated: protocolInstance.followPrescriptionId,
            activatedAt: currentTime.toISOString(),
            followUpStartsAt: startTime.toISOString(),
            followUpEndsAt: endTime.toISOString(),
            anchorTime: anchorTime.toISOString()
          } as any
        };
        
        if (userId) {
          auditLogData.userId = userId;
        }
        
        await storage.createAuditLog(auditLogData);
        
      } catch (protocolError) {
        console.error(`Failed to activate protocol ${protocolInstance.id}:`, protocolError);
      }
    }
  } catch (error) {
    console.error('Error in activateProtocols:', error);
    throw error;
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'medchart-session-secret-key-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Seed users on startup
  await seedUsers();

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, pin } = req.body;
      
      if (!pin) {
        return res.status(400).json({ message: "PIN is required" });
      }

      let user;
      
      // Handle PIN-only login (when no username provided)
      if (!username || username.trim() === "") {
        const userResults = await db.select().from(users).where(eq(users.pin, pin));
        
        if (userResults.length === 0) {
          return res.status(401).json({ message: "Invalid PIN" });
        }
        user = userResults[0];
      } else {
        // Handle username + PIN login
        const userResults = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
        
        if (userResults.length === 0 || userResults[0].pin !== pin) {
          return res.status(401).json({ message: "Invalid username or PIN" });
        }
        user = userResults[0];
      }

      // Create session directly in SQLite
      const token = randomUUID();
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      
      await db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        token: token,
        expiresAt: new Date(expiresAt)
      });

      // Store token in session
      (req.session as any).authToken = token;

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        }, 
        token 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req: any, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.authToken;
      if (token) {
        await db.delete(sessions).where(eq(sessions.token, token));
      }
      req.session?.destroy?.();
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/user", requireAuth, async (req: any, res) => {
    res.json(req.user);
  });

  // User management routes (instructor only)
  app.get("/api/users", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        pin: users.pin,
        role: users.role,
        createdAt: users.createdAt
      }).from(users);

      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      const { username, pin, role } = req.body;

      if (!username || !pin || !role) {
        return res.status(400).json({ message: "Username, PIN, and role are required" });
      }

      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be exactly 6 digits" });
      }

      if (!['student', 'instructor'].includes(role)) {
        return res.status(400).json({ message: "Role must be either 'student' or 'instructor'" });
      }

      // Check if PIN already exists
      const existingUser = await storage.getUserByPin(pin);
      if (existingUser) {
        return res.status(400).json({ message: "PIN already exists. Please choose a different PIN." });
      }

      const newUser = await storage.createUser({ username, pin, role });
      
      // Log user creation
      await storage.createAuditLog({
        entityType: 'user',
        entityId: newUser.id,
        action: 'create',
        changes: {
          userCreated: true,
          createdBy: req.user.username,
          newUsername: username,
          newRole: role
        } as Record<string, any>,
        userId: req.user.id
      });

      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        pin: newUser.pin,
        role: newUser.role,
        createdAt: newUser.createdAt
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req: any, res) => {
    try {
      if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      const userId = req.params.id;

      // Prevent self-deletion
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const userToDelete = await storage.getUserById(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      const result = await db.delete(users).where(eq(users.id, userId));
      
      if ((result.rowCount || 0) > 0) {
        // Log user deletion
        await storage.createAuditLog({
          entityType: 'user',
          entityId: userId,
          action: 'delete',
          changes: {
            userDeleted: true,
            deletedBy: req.user.username,
            deletedUsername: userToDelete.username,
            deletedRole: userToDelete.role
          } as Record<string, any>,
          userId: req.user.id
        });

        res.json({ message: "User deleted successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get patient by ID
  app.get("/api/patients/:id", async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new patient (requires authentication)
  app.post("/api/patients", requireAuth, async (req: any, res) => {
    try {
      console.log('Patient creation request body:', req.body);
      
      // Handle chartData conversion from object to JSON string
      const bodyWithStringifiedChartData = {
        ...req.body,
        chartData: req.body.chartData ? JSON.stringify(req.body.chartData) : null
      };
      
      console.log('Patient data after chartData conversion:', bodyWithStringifiedChartData);
      
      const validatedData = insertPatientSchema.parse(bodyWithStringifiedChartData);
      console.log('Patient data after validation:', validatedData);
      
      const patient = await storage.createPatient(validatedData);
      
      // Log patient creation
      await storage.createAuditLog({
        entityType: 'patient',
        entityId: patient.id,
        action: 'create',
        changes: JSON.stringify({ 
          patientCreated: true,
          createdBy: req.user.username,
          patientName: validatedData.name 
        }),
        userId: req.user.id
      });
      
      res.status(201).json(patient);
    } catch (error) {
      console.error("Patient creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all patients
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get medicine by ID
  app.get("/api/medicines/:id", async (req, res) => {
    try {
      const medicine = await storage.getMedicine(req.params.id);
      if (!medicine) {
        return res.status(404).json({ message: "Medicine not found" });
      }
      res.json(medicine);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all medicines
  app.get("/api/medicines", async (req, res) => {
    try {
      const medicines = await storage.getAllMedicines();
      // Add category field for pain medications if missing
      const medicinesWithCategories = medicines.map(med => ({
        ...med,
        category: getPainMedicineCategory(med.name)
      }));
      res.json(medicinesWithCategories);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      // Fallback to essential pain medications if database fails
      const fallbackMedicines = [
        { id: '09509828', name: 'Morphine', drawer: 'B1', bin: '01', dosage: '2-4mg IV q2-4h PRN', category: 'pain-killer' },
        { id: '39584729', name: 'Fentanyl', drawer: 'B1', bin: '02', dosage: '25-100mcg IV q1-2h PRN', category: 'pain-killer' },
        { id: '48592840', name: 'Dilaudid', drawer: 'B1', bin: '03', dosage: '0.5-2mg IV q2-3h PRN', category: 'pain-killer' },
        { id: '31908432', name: 'Acetaminophen', drawer: 'A1', bin: '01', dosage: '325-650mg PO q4-6h PRN', category: 'pain-killer' },
        { id: '35769341', name: 'Ibuprofen/Motrin', drawer: 'A1', bin: '04', dosage: '400-600mg PO q6-8h', category: 'pain-killer' }
      ];
      res.json(fallbackMedicines);
    }
  });

// Helper function to categorize pain medications
function getPainMedicineCategory(medicineName: string): string {
  const painMeds = ['morphine', 'fentanyl', 'dilaudid', 'percocet', 'codeine', 'tramadol', 'acetaminophen', 'ibuprofen', 'motrin', 'tylenol'];
  const lowerName = medicineName.toLowerCase();
  
  if (painMeds.some(pain => lowerName.includes(pain))) {
    return 'pain-killer';
  }
  return 'other';
}

  // Get prescriptions for a patient
  app.get("/api/patients/:patientId/prescriptions", async (req, res) => {
    try {
      const prescriptions = await storage.getPrescriptionsByPatient(req.params.patientId);
      res.json(prescriptions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get administrations for a patient
  app.get("/api/patients/:patientId/administrations", async (req, res) => {
    try {
      const administrations = await storage.getAdministrationsByPatient(req.params.patientId);
      res.json(administrations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get lab results for a patient
  app.get("/api/patients/:patientId/lab-results", async (req, res) => {
    try {
      const labResults = await storage.getLabResultsByPatient(req.params.patientId);
      // Sort by taken date descending (most recent first)
      if (labResults && labResults.length > 0) {
        labResults.sort((a, b) => {
          const aDate = a.takenAt ? new Date(a.takenAt).getTime() : 0;
          const bDate = b.takenAt ? new Date(b.takenAt).getTime() : 0;
          return bDate - aDate;
        });
      }
      res.json(labResults);
    } catch (error) {
      console.error('Error fetching lab results:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Order lab tests (creates artificial lab results)
  app.post("/api/lab-orders", async (req, res) => {
    try {
      const { patientId, tests, orderDate } = req.body;
      
      if (!patientId || !tests || !Array.isArray(tests) || tests.length === 0) {
        return res.status(400).json({ message: "Invalid order data" });
      }

      // Verify patient exists
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Generate artificial lab results for each test
      const resultsCreated = await storage.createLabOrders(patientId, tests, orderDate);
      
      res.status(201).json({ 
        message: "Lab orders created successfully",
        patientId,
        testsOrdered: tests.length,
        resultsCreated,
        orderDate 
      });
    } catch (error) {
      console.error('Error creating lab orders:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Order imaging studies (creates artificial imaging results)
  app.post("/api/imaging-orders", async (req, res) => {
    try {
      const { patientId, tests, orderDate } = req.body;
      
      if (!patientId || !tests || !Array.isArray(tests) || tests.length === 0) {
        return res.status(400).json({ message: "Invalid order data" });
      }

      // Verify patient exists
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Generate artificial imaging results for each test
      const resultsCreated = await storage.createImagingOrders(patientId, tests, orderDate);
      
      res.status(201).json({ 
        message: "Imaging orders created successfully",
        patientId,
        testsOrdered: tests.length,
        resultsCreated,
        orderDate 
      });
    } catch (error) {
      console.error('Error creating imaging orders:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check if a prescription is a follow-up and if trigger is administered
  app.post("/api/patients/:patientId/protocols/check-followup", requireAuth, async (req: any, res) => {
    try {
      const { patientId } = req.params;
      const { prescriptionId } = req.body;
      
      if (!prescriptionId) {
        return res.status(400).json({ message: "Prescription ID is required" });
      }
      
      // Get all protocol instances for this patient
      const protocolInstances = await storage.getProtocolInstancesByPatient(patientId);
      
      // Check if this prescription is a follow-up (exists in followPrescriptionId)
      const followUpInstance = protocolInstances.find(instance => 
        instance.followPrescriptionId === prescriptionId
      );
      
      if (!followUpInstance) {
        // Not a follow-up prescription
        return res.json({
          isFollowUp: false,
          triggerAdministered: true // Allow administration since it's not a follow-up
        });
      }
      
      // This is a follow-up prescription, check if trigger has been administered
      const triggerPrescription = await storage.getPrescription(followUpInstance.triggerPrescriptionId);
      if (!triggerPrescription) {
        return res.status(404).json({ message: "Trigger prescription not found" });
      }
      
      // Check if trigger prescription has been successfully administered (using prescriptionId for security)
      const administrations = await storage.getAdministrationsByPatient(patientId);
      const triggerAdministered = administrations.some(admin => 
        admin.prescriptionId === followUpInstance.triggerPrescriptionId && 
        admin.status === 'administered'
      );
      
      res.json({
        isFollowUp: true,
        triggerAdministered,
        triggerMedicineId: triggerPrescription.medicineId,
        triggerPrescriptionId: followUpInstance.triggerPrescriptionId
      });
      
    } catch (error) {
      console.error('Error checking follow-up status:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Record medication administration (requires authentication)
  app.post("/api/administrations", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertAdministrationSchema.parse(req.body);
      
      // CRITICAL SECURITY VALIDATION: Verify prescription ID belongs to patient and matches medicine
      // This prevents ID spoofing attacks that could bypass follow-up protocol requirements
      if (validatedData.prescriptionId) {
        try {
          // Load and verify the prescription exists and belongs to the correct patient/medicine
          const prescription = await storage.getPrescription(validatedData.prescriptionId);
          
          if (!prescription) {
            return res.status(400).json({
              message: "Invalid prescription ID - prescription not found",
              error: 'PRESCRIPTION_NOT_FOUND'
            });
          }
          
          // SECURITY CHECK: Verify prescription belongs to the specified patient
          if (prescription.patientId !== validatedData.patientId) {
            // Create audit log for potential ID spoofing attempt
            try {
              await storage.createAuditLog({
                entityType: 'administration',
                entityId: validatedData.prescriptionId,
                action: 'block',
                changes: {
                  reason: 'patient_id_mismatch',
                  prescriptionPatientId: prescription.patientId,
                  suppliedPatientId: validatedData.patientId,
                  blockMessage: 'Prescription ID does not belong to the specified patient',
                  attemptedBy: req.user.id
                } as any,
                userId: req.user.id
              });
            } catch (auditError) {
              console.error('Failed to create audit log for patient ID mismatch:', auditError);
            }
            
            return res.status(409).json({
              message: "SECURITY: Prescription ID does not belong to the specified patient",
              error: 'PATIENT_ID_MISMATCH'
            });
          }
          
          // SECURITY CHECK: Verify prescription medicine matches the supplied medicine ID
          if (prescription.medicineId !== validatedData.medicineId) {
            // Create audit log for potential ID spoofing attempt
            try {
              await storage.createAuditLog({
                entityType: 'administration',
                entityId: validatedData.prescriptionId,
                action: 'block',
                changes: {
                  reason: 'medicine_id_mismatch',
                  prescriptionMedicineId: prescription.medicineId,
                  suppliedMedicineId: validatedData.medicineId,
                  blockMessage: 'Prescription medicine ID does not match the supplied medicine ID',
                  attemptedBy: req.user.id
                } as any,
                userId: req.user.id
              });
            } catch (auditError) {
              console.error('Failed to create audit log for medicine ID mismatch:', auditError);
            }
            
            return res.status(409).json({
              message: "SECURITY: Prescription medicine ID does not match the supplied medicine ID",
              error: 'MEDICINE_ID_MISMATCH'
            });
          }
          
          console.log(`✅ Prescription verification passed for ${validatedData.prescriptionId}: patient=${prescription.patientId}, medicine=${prescription.medicineId}`);
          
        } catch (prescriptionError) {
          console.error('Prescription verification failed - blocking administration for security:', prescriptionError);
          
          try {
            await storage.createAuditLog({
              entityType: 'administration',
              entityId: validatedData.prescriptionId || 'unknown',
              action: 'block',
              changes: {
                reason: 'prescription_verification_error',
                error: prescriptionError.message,
                blockMessage: 'Administration blocked due to prescription verification error',
                attemptedBy: req.user.id
              } as any,
              userId: req.user.id
            });
          } catch (auditError) {
            console.error('Failed to create audit log for prescription verification error:', auditError);
          }
          
          return res.status(422).json({ 
            message: "Administration blocked - unable to verify prescription authenticity for security",
            error: 'PRESCRIPTION_VERIFICATION_FAILED'
          });
        }
      }
      
      // CRITICAL SECURITY VALIDATION: Check follow-up constraints before allowing administration
      if (validatedData.status === 'administered' && validatedData.prescriptionId) {
        try {
          // Get protocol instances for this patient
          const protocolInstances = await storage.getProtocolInstancesByPatient(validatedData.patientId);
          
          // Check if this prescription is a follow-up in any protocol
          const followUpInstance = protocolInstances.find(instance => 
            instance.followPrescriptionId === validatedData.prescriptionId
          );
          
          if (followUpInstance) {
            // This is a follow-up prescription - verify trigger has been administered AND enough time has passed
            const administrations = await storage.getAdministrationsByPatient(validatedData.patientId);
            const triggerAdmin = administrations.find(admin => 
              admin.prescriptionId === followUpInstance.triggerPrescriptionId && 
              admin.status === 'administered'
            );
            
            if (!triggerAdmin) {
              // BLOCK: Trigger medication not administered yet
              const triggerPrescription = await storage.getPrescription(followUpInstance.triggerPrescriptionId);
              const triggerMedicine = triggerPrescription ? await storage.getMedicine(triggerPrescription.medicineId) : null;
              
              const blockMessage = `BLOCKED: Follow-up medication administration blocked - trigger medication ${triggerMedicine?.name || 'Unknown'} must be administered first`;
              
              // Create audit log for blocked attempt
              try {
                await storage.createAuditLog({
                  entityType: 'administration',
                  entityId: validatedData.prescriptionId,
                  action: 'block',
                  changes: {
                    reason: 'trigger_not_administered',
                    triggerPrescriptionId: followUpInstance.triggerPrescriptionId,
                    triggerMedicineId: triggerPrescription?.medicineId,
                    blockMessage: blockMessage,
                    attemptedBy: req.user.id
                  } as any,
                  userId: req.user.id
                });
              } catch (auditError) {
                console.error('Failed to create audit log for blocked administration:', auditError);
              }
              
              return res.status(409).json({ 
                message: blockMessage,
                error: 'FOLLOW_UP_BLOCKED',
                triggerRequired: true,
                triggerMedicine: triggerMedicine?.name,
                triggerPrescriptionId: followUpInstance.triggerPrescriptionId
              });
            }
            
            // BLOCK: Check if enough time has elapsed since trigger administration
            try {
              // Get the medication link to find the required delay
              const medicationLink = await storage.getMedicationLinkById(followUpInstance.linkId);
              if (medicationLink && triggerAdmin.administeredAt) {
                const triggerTime = new Date(triggerAdmin.administeredAt);
                const requiredDelayMs = medicationLink.delayMinutes * 60 * 1000;
                // Allow collection 1 hour before delay expires (subtract 1 hour = 3600000ms)
                const dueTime = new Date(triggerTime.getTime() + requiredDelayMs - (60 * 60 * 1000));
                const now = timeSimulation.getCurrentTime();
                
                if (now < dueTime) {
                  // BLOCK: Too early - not enough time has passed
                  const timeLeft = dueTime.getTime() - now.getTime();
                  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                  
                  const timeDisplay = days > 0 ? `${days}d ${hours}h` : 
                                     hours > 0 ? `${hours}h ${minutes}m` : 
                                     `${minutes}m`;
                  
                  const blockMessage = `BLOCKED: Follow-up medication too early - must wait ${timeDisplay} (due ${dueTime.toLocaleString()})`;
                  
                  // Create audit log for blocked attempt
                  try {
                    await storage.createAuditLog({
                      entityType: 'administration',
                      entityId: validatedData.prescriptionId,
                      action: 'block',
                      changes: {
                        reason: 'protocol_timing_too_early',
                        triggerAdministeredAt: triggerAdmin.administeredAt,
                        requiredDelayMinutes: medicationLink.delayMinutes,
                        dueAt: dueTime.toISOString(),
                        timeLeftMs: timeLeft,
                        blockMessage: blockMessage,
                        attemptedBy: req.user.id
                      } as any,
                      userId: req.user.id
                    });
                  } catch (auditError) {
                    console.error('Failed to create audit log for timing-blocked administration:', auditError);
                  }
                  
                  return res.status(409).json({ 
                    message: blockMessage,
                    error: 'PROTOCOL_TIMING_TOO_EARLY',
                    triggerAdministeredAt: triggerAdmin.administeredAt,
                    dueAt: dueTime.toISOString(),
                    timeLeftMs: timeLeft,
                    timeLeftDisplay: timeDisplay
                  });
                }
              }
            } catch (timingError) {
              console.error('Error checking protocol timing:', timingError);
              // Continue with administration if timing check fails - safety allows it
            }
          }
        } catch (followUpError) {
          // CRITICAL SECURITY: Fail-closed on validation errors
          console.error('Follow-up validation failed - blocking administration for safety:', followUpError);
          
          try {
            await storage.createAuditLog({
              entityType: 'administration',
              entityId: validatedData.prescriptionId || 'unknown',
              action: 'block',
              changes: {
                reason: 'validation_error',
                error: followUpError.message,
                blockMessage: 'Administration blocked due to validation error',
                attemptedBy: req.user.id
              } as any,
              userId: req.user.id
            });
          } catch (auditError) {
            console.error('Failed to create audit log for validation error:', auditError);
          }
          
          return res.status(422).json({ 
            message: "Administration blocked - unable to verify follow-up protocol requirements for safety",
            error: 'VALIDATION_FAILED'
          });
        }
      }
      
      // CRITICAL FIX: Use verified prescriptionId from req.body after security validation
      const { prescriptionId } = req.body;
      const administrationData: InsertAdministration = {
        ...validatedData,
        prescriptionId: prescriptionId, // Use verified prescriptionId from req.body
        administeredBy: req.user.id
      };
      
      
      let administration;
      try {
        administration = await storage.createAdministration(administrationData);
      } catch (administrationError) {
        console.error('Administration creation failed:', administrationError);
        console.error('Administration data:', administrationData);
        return res.status(500).json({ 
          message: "Failed to record medication administration",
          error: 'ADMINISTRATION_CREATION_FAILED'
        });
      }
      
      // After successful administration, check for protocol activation
      try {
        await activateProtocols(administration, req.user.id);
      } catch (protocolError) {
        // Log but don't fail the administration - protocol activation is supplementary
        console.error('Protocol activation failed (administration still succeeded):', protocolError);
      }
      
      // Check if this prescription should be marked as complete when doses reach 0
      if (administrationData.status === 'administered') {
        try {
          let prescription: any = null;
          
          // Try to get prescription by prescription_id first (preferred)
          if (administrationData.prescriptionId) {
            prescription = await storage.getPrescription(administrationData.prescriptionId);
          } else {
            // Fallback: Find prescription by patient and medicine for legacy data
            const allPrescriptions = await storage.getPrescriptionsByPatient(administrationData.patientId);
            prescription = allPrescriptions.find(p => p.medicineId === administrationData.medicineId);
          }
          
          if (prescription) {
            // Handle "Once" prescriptions - should be completed after first administration
            if (prescription.periodicity.toLowerCase() === 'once') {
              await storage.markPrescriptionComplete(prescription.id);
              console.log(`✅ Prescription ${prescription.id} marked as complete - "Once" medication administered`);
            }
            // Handle dose-tracked prescriptions
            else if (prescription.totalDoses !== null) {
              // Count total administered doses for this prescription
              const allAdmins = await storage.getAdministrationsByPatient(administrationData.patientId);
              const administeredCount = allAdmins.filter(admin => 
                (admin.prescriptionId === prescription.id) || 
                (!admin.prescriptionId && admin.medicineId === prescription.medicineId)
              ).filter(admin => admin.status === 'administered').length;
              
              // If all doses have been administered, mark prescription as complete
              if (administeredCount >= prescription.totalDoses) {
                await storage.markPrescriptionComplete(prescription.id);
                console.log(`✅ Prescription ${prescription.id} marked as complete - all ${prescription.totalDoses} doses administered`);
              }
            }
          }
        } catch (error) {
          // Don't fail the administration if completion check fails
          console.error('Error checking prescription completion:', error);
        }
      }
      
      res.status(201).json(administration);
    } catch (error) {
      console.error('CRITICAL ERROR in POST /api/administrations:', error);
      console.error('Request body:', req.body);
      console.error('Request user:', req.user);
      console.error('Error stack:', error?.stack);
      
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid administration data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get audit logs for a specific entity
  app.get("/api/audit/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const auditLogs = await storage.getAuditLogsByEntity(entityType, entityId);
      res.json(auditLogs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new medicine
  app.post("/api/medicines", async (req, res) => {
    try {
      // SECURITY FIX: Remove client-provided ID and generate sequential ID
      const { id, ...medicineData } = req.body;
      
      // Log warning if client tried to send an ID
      if (id) {
        console.warn('⚠️ Client tried to provide medicine ID:', id, '- ignoring and using sequential ID');
      }
      
      // Generate next sequential ID
      const existingMedicines = await db.select({ id: medicines.id }).from(medicines);
      let maxId = 10000000;
      existingMedicines.forEach(med => {
        const numericPart = parseInt(med.id);
        if (!isNaN(numericPart) && numericPart > maxId) {
          maxId = numericPart;
        }
      });
      const sequentialId = (maxId + 1).toString();
      
      // Validate data without ID and add sequential ID
      const validatedData = insertMedicineSchema.omit({ id: true }).parse(medicineData);
      const fullMedicineData = { ...validatedData, id: sequentialId };
      
      console.log('🆔 MEDICINE CREATE: Auto-generated sequential ID:', sequentialId);
      const medicine = await storage.createMedicine(fullMedicineData);
      res.status(201).json(medicine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid medicine data", errors: error.errors });
      }
      console.error('Error creating medicine:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add prescription (requires PIN validation)
  app.post("/api/patients/:patientId/prescriptions", requireAuth, async (req: any, res) => {
    try {
      const { medicineId, dosage, periodicity, duration, route, startDate, endDate, pin } = req.body;
      const user = req.user;
      
      // Check if user has permission
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }
      
      // For instructors, verify PIN - admins bypass PIN check
      if (user.role === 'instructor' && pin !== "1234") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }
      
      console.log('Prescription data received:', { 
        patientId: req.params.patientId,
        medicineId,
        dosage,
        periodicity,
        duration,
        route: route || "Oral",
        startDate,
        endDate
      });
      
      // Handle date conversion explicitly
      let convertedStartDate = null;
      let convertedEndDate = null;
      
      if (startDate && startDate !== '') {
        try {
          convertedStartDate = new Date(startDate);
          if (isNaN(convertedStartDate.getTime())) {
            convertedStartDate = null;
          }
        } catch {
          convertedStartDate = null;
        }
      }
      
      if (endDate && endDate !== '') {
        try {
          convertedEndDate = new Date(endDate);
          if (isNaN(convertedEndDate.getTime())) {
            convertedEndDate = null;
          }
        } catch {
          convertedEndDate = null;
        }
      }

      const validatedData = insertPrescriptionSchema.parse({
        patientId: req.params.patientId,
        medicineId,
        dosage,
        periodicity,
        duration,
        route: route || "Oral",
        startDate: convertedStartDate,
        endDate: convertedEndDate
      });
      
      console.log('Prescription data validated:', validatedData);
      
      const prescription = await storage.createPrescription(validatedData);
      
      res.status(201).json(prescription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid prescription data", errors: error.errors });
      }
      console.error('Error adding prescription:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update prescription (requires PIN validation)
  app.patch("/api/patients/:patientId/prescriptions/:prescriptionId", requireAuth, async (req: any, res) => {
    try {
      const { dosage, periodicity, duration, route, startDate, endDate, pin } = req.body;
      const user = req.user;
      
      // Check if user has permission
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }
      
      // For instructors, verify PIN - admins bypass PIN check
      if (user.role === 'instructor' && pin !== "1234") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }
      
      const updates = { 
        dosage, 
        periodicity, 
        duration,
        route,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      };
      const updatedPrescription = await storage.updatePrescription(req.params.prescriptionId, updates);
      
      if (!updatedPrescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }
      
      // Audit log temporarily disabled due to database schema issues
      console.log('Prescription update completed successfully for patient:', req.params.patientId);
      
      res.json(updatedPrescription);
    } catch (error) {
      console.error('Error updating prescription:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove prescription (requires PIN validation)
  app.delete("/api/patients/:patientId/prescriptions/:prescriptionId", requireAuth, async (req: any, res) => {
    try {
      const { pin } = req.body;
      const user = req.user;
      
      // Check if user has permission
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }
      
      // For instructors, verify PIN - admins bypass PIN check
      if (user.role === 'instructor' && pin !== "1234") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }
      
      const deleted = await storage.deletePrescription(req.params.prescriptionId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Prescription not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: 'prescription',
        entityId: req.params.prescriptionId,
        action: 'delete',
        changes: {
          patient_id: req.params.patientId,
          prescription_id: req.params.prescriptionId,
          action: 'prescription_removed'
        } as any
      });
      
      res.json({ message: "Prescription removed successfully" });
    } catch (error) {
      console.error('Error removing prescription:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get medication links by trigger medicine ID (for prescription prompting)
  app.get("/api/medication-links", async (req, res) => {
    try {
      const { triggerMedicineId } = req.query;
      
      if (!triggerMedicineId) {
        return res.status(400).json({ message: "triggerMedicineId query parameter is required" });
      }
      
      const links = await storage.getMedicationLinksByTrigger(triggerMedicineId as string);
      res.json(links);
    } catch (error) {
      console.error('Error fetching medication links:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Instantiate a medication protocol (creates follow-up prescription and protocol instance)
  app.post("/api/patients/:patientId/protocols/instantiate", requireAuth, async (req: any, res) => {
    try {
      const { linkId, triggerPrescriptionId, overrides, pin } = req.body;
      const user = req.user;
      
      // Check if user has permission (same as prescription creation)
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }
      
      // For instructors, verify PIN - admins bypass PIN check
      if (user.role === 'instructor' && pin !== "1234") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }
      
      if (!linkId || !triggerPrescriptionId) {
        return res.status(400).json({ message: "linkId and triggerPrescriptionId are required" });
      }
      
      // Verify triggerPrescriptionId belongs to the specified patient
      const triggerPrescription = await storage.getPrescription(triggerPrescriptionId);
      if (!triggerPrescription) {
        return res.status(404).json({ message: "Trigger prescription not found" });
      }
      
      if (triggerPrescription.patientId !== req.params.patientId) {
        return res.status(400).json({ message: "Trigger prescription does not belong to the specified patient" });
      }
      
      // Get the medication link details
      const links = await storage.getAllMedicationLinks();
      const link = links.find(l => l.id === linkId);
      
      if (!link) {
        return res.status(404).json({ message: "Medication link not found" });
      }
      
      // Verify trigger prescription's medicine matches link.triggerMedicineId
      if (triggerPrescription.medicineId !== link.triggerMedicineId) {
        return res.status(400).json({ message: "Trigger prescription medicine does not match protocol requirements" });
      }
      
      // Check for duplicate instantiations
      const existingInstances = await storage.getProtocolInstancesByPatient(req.params.patientId);
      const duplicateInstance = existingInstances.find(instance => 
        instance.linkId === linkId && instance.triggerPrescriptionId === triggerPrescriptionId
      );
      
      if (duplicateInstance) {
        return res.status(400).json({ message: "Protocol has already been instantiated for this trigger prescription" });
      }
      
      // Get the follow-up medicine details
      const followMedicine = await storage.getMedicine(link.followMedicineId);
      if (!followMedicine) {
        return res.status(404).json({ message: "Follow-up medicine not found" });
      }
      
      // Create the follow-up prescription (initially inactive - no startDate)
      const followPrescription = await storage.createPrescription({
        patientId: req.params.patientId,
        medicineId: link.followMedicineId,
        dosage: overrides?.dosage || link.defaultDoseOverride || followMedicine.dose,
        periodicity: overrides?.periodicity || link.followFrequency,
        duration: overrides?.duration || `${link.followDurationHours} hours`,
        route: overrides?.route || followMedicine.route,
        startDate: null, // Will be set when protocol activates
        endDate: null    // Will be calculated when protocol activates
      });
      
      // Create the protocol instance
      const protocolInstance = await storage.createProtocolInstance({
        patientId: req.params.patientId,
        linkId: linkId,
        triggerPrescriptionId: triggerPrescriptionId,
        followPrescriptionId: followPrescription.id,
        activatedAt: null // Will be set when trigger medicine is administered
      });
      
      res.json({
        message: "Protocol instantiated successfully",
        followPrescription,
        protocolInstance
      });
    } catch (error) {
      console.error('Error instantiating protocol:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get protocol instances for a patient
  app.get("/api/patients/:patientId/protocols", async (req, res) => {
    try {
      const instances = await storage.getProtocolInstancesByPatient(req.params.patientId);
      res.json(instances);
    } catch (error) {
      console.error('Error fetching protocol instances:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update patient data (requires authentication)
  app.patch("/api/patients/:id", requireAuth, async (req: any, res) => {
    console.log('🚨 PATCH ROUTE HIT - ID:', req.params.id);
    console.log('🚨 PATCH REQUEST BODY:', JSON.stringify(req.body, null, 2));
    
    try {
      const updates = insertPatientSchema.partial().parse(req.body);
      
      // Get the original patient data for audit logging
      const originalPatient = await storage.getPatient(req.params.id);
      if (!originalPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      const updatedPatient = await storage.updatePatient(req.params.id, updates, req.user.id);
      
      // Create audit log for the patient update (don't let this block the response)
      try {
        const changeDetails = {
          updated_fields: Object.keys(updates),
          changes: Object.keys(updates).reduce((acc, field) => {
            acc[field] = {
              from: (originalPatient as any)[field],
              to: (updatedPatient as any)[field]
            };
            return acc;
          }, {} as Record<string, any>),
          updatedBy: req.user.username
        } as Record<string, any>;

        await storage.createAuditLog({
          entityType: 'patient',
          entityId: req.params.id,
          action: 'update',
          changes: changeDetails,
          userId: req.user.id
        });
      } catch (auditError) {
        console.error('Audit log failed for patient update, but update succeeded:', auditError);
      }
      
      res.json(updatedPatient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      console.error('Error updating patient:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Care Notes endpoints (MUST come before patient deletion route to avoid conflicts)
  app.get("/api/patients/:patientId/care-notes", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const careNotes = await storage.getCareNotesByPatient(patientId);
      res.json(careNotes);
    } catch (error) {
      console.error('Error fetching care notes:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/patients/:patientId/care-notes", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const { content, category } = req.body;
      const user = (req as any).user;

      const careNoteData = {
        id: randomUUID(),
        patientId,
        content,
        category,
        createdBy: user.id,
      };

      const careNote = await storage.createCareNote(careNoteData);
      res.status(201).json(careNote);
    } catch (error) {
      console.error('Error creating care note:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/patients/:patientId/care-notes/:noteId", requireAuth, async (req, res) => {
    try {
      const { noteId } = req.params;
      const user = (req as any).user;

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only instructors and admins can delete care notes." });
      }

      const deleted = await storage.deleteCareNote(noteId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Care note not found" });
      }

      res.json({ message: "Care note deleted successfully" });
    } catch (error) {
      console.error('Error deleting care note:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete patient (requires PIN validation)
  app.delete("/api/patients/:id", async (req, res) => {
    try {
      const { pin } = req.body;
      
      // Validate PIN (instructor or admin)
      if (pin !== "112794" && pin !== "0000") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }
      
      // Check if patient exists
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      const deleted = await storage.deletePatient(req.params.id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete patient" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        entityType: 'patient',
        entityId: req.params.id,
        action: 'delete',
        changes: {
          patient_id: req.params.id,
          patient_name: patient.name,
          action: 'patient_deleted'
        } as any
      });
      
      res.json({ message: "Patient deleted successfully" });
    } catch (error) {
      console.error('Error deleting patient:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Vitals routes
  app.get("/api/patients/:patientId/vitals", async (req, res) => {
    try {
      const vitals = await storage.getVitalsByPatient(req.params.patientId);
      res.json(vitals);
    } catch (error) {
      console.error('Error fetching vitals:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/patients/:patientId/vitals", requireAuth, async (req: any, res) => {
    try {
      console.log('Raw vitals request body:', req.body);
      
      // Remove takenAt from request and let database default handle it
      const { takenAt, ...bodyWithoutTakenAt } = req.body;
      
      const finalData = insertVitalsSchema.parse({
        ...bodyWithoutTakenAt,
        patientId: req.params.patientId,
        takenBy: req.user.username // Set who recorded the vitals
      });
      
      console.log('Validated vitals data:', finalData);
      const vital = await storage.createVitals(finalData);
      
      // Log vitals creation
      await storage.createAuditLog({
        entityType: 'vitals',
        entityId: vital.id,
        action: 'create',
        changes: JSON.stringify({
          vitalsRecorded: true,
          recordedBy: req.user.username,
          patientId: req.params.patientId,
          pulse: finalData.pulse,
          temperature: finalData.temperature,
          respirationRate: finalData.respirationRate,
          bloodPressure: `${finalData.bloodPressureSystolic}/${finalData.bloodPressureDiastolic}`,
          takenAt: finalData.takenAt
        }),
        userId: req.user.id
      });
      
      res.status(201).json(vital);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vitals data", errors: error.errors });
      }
      console.error('Error creating vitals:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all lab test types
  app.get("/api/lab-test-types", async (req, res) => {
    try {
      const labTestTypes = await storage.getAllLabTestTypes();
      res.json(labTestTypes);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new lab test type
  app.post("/api/lab-test-types", async (req, res) => {
    try {
      const validatedData = insertLabTestTypeSchema.parse(req.body);
      const labTestType = await storage.createLabTestType(validatedData);
      res.status(201).json(labTestType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid lab test type data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get patient reminders
  app.get("/api/patients/:patientId/reminders", async (req, res) => {
    try {
      const reminders = await reminderService.getPatientReminders(req.params.patientId);
      res.json(reminders);
    } catch (error) {
      console.error('Error fetching patient reminders:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all upcoming reminders
  app.get("/api/reminders/upcoming", async (req, res) => {
    try {
      const reminders = await reminderService.getAllUpcomingReminders();
      res.json(reminders);
    } catch (error) {
      console.error('Error fetching upcoming reminders:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current alerts
  app.get("/api/reminders/alerts", async (req, res) => {
    try {
      const alerts = await reminderService.getAlertsToSend();
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching reminder alerts:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Time simulation endpoints for training
  app.post("/api/time-simulation/jump", async (req, res) => {
    try {
      const { hours = 0, minutes = 0, pin } = req.body;
      
      // Validate PIN (instructor or admin)
      if (pin !== "112794" && pin !== "0000") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }
      
      const newTime = timeSimulation.jumpForward(Number(hours), Number(minutes));
      const status = timeSimulation.getTimeStatus();
      
      res.json({
        message: `Time advanced by ${hours}h ${minutes}m`,
        newTime,
        status
      });
    } catch (error) {
      console.error('Error jumping time:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/time-simulation/reset", async (req, res) => {
    try {
      const { pin } = req.body;
      
      // Validate PIN (instructor or admin)
      if (pin !== "112794" && pin !== "0000") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }
      
      const realTime = timeSimulation.resetTime();
      const status = timeSimulation.getTimeStatus();
      
      res.json({
        message: "Time reset to real time",
        realTime,
        status
      });
    } catch (error) {
      console.error('Error resetting time:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Medication alerts route
  app.get("/api/medication-alerts", async (req, res) => {
    try {
      const alerts = await reminderService.getAllActiveAlerts();
      res.json({ alerts });
    } catch (error) {
      console.error('Error fetching medication alerts:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/time-simulation/status", async (req, res) => {
    try {
      const status = timeSimulation.getTimeStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting time status:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete lab result (instructor/admin only)
  app.delete("/api/lab-results/:labResultId", requireAuth, async (req, res) => {
    try {
      const { labResultId } = req.params;
      const { pin } = req.body;
      const user = (req as any).user;

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      // Validate PIN for instructor, skip for admin
      if (user.role === 'instructor' && pin !== "112794" && pin !== "0000") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }

      const deleted = await storage.deleteLabResult(labResultId);
      if (!deleted) {
        return res.status(404).json({ message: "Lab result not found" });
      }

      res.json({ message: "Lab result deleted successfully" });
    } catch (error) {
      console.error('Error deleting lab result:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Clear all administrations (admin only)
  app.delete("/api/admin/administrations/clear-all", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      await storage.deleteAllAdministrations();
      res.json({ message: "All administration records cleared successfully" });
    } catch (error) {
      console.error('Error clearing all administrations:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete administration record (instructor/admin only)
  app.delete("/api/administrations/:administrationId", requireAuth, async (req, res) => {
    try {
      const { administrationId } = req.params;
      const { pin } = req.body;
      const user = (req as any).user;

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      // Validate PIN for instructor, skip for admin
      if (user.role === 'instructor' && pin !== "112794" && pin !== "0000") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }

      const deleted = await storage.deleteAdministration(administrationId);
      if (!deleted) {
        return res.status(404).json({ message: "Administration record not found" });
      }

      res.json({ message: "Administration record deleted successfully" });
    } catch (error) {
      console.error('Error deleting administration record:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete vitals record (instructor/admin only)
  app.delete("/api/vitals/:vitalId", requireAuth, async (req, res) => {
    try {
      const { vitalId } = req.params;
      const { pin } = req.body;
      const user = (req as any).user;

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      // Validate PIN for instructor, skip for admin
      if (user.role === 'instructor' && pin !== "112794" && pin !== "0000") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }

      const deleted = await storage.deleteVitals(vitalId);
      if (!deleted) {
        return res.status(404).json({ message: "Vitals record not found" });
      }

      res.json({ message: "Vitals record deleted successfully" });
    } catch (error) {
      console.error('Error deleting vitals record:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  // Intake/Output endpoints
  app.get("/api/patients/:patientId/intake-output", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const intakeOutput = await storage.getIntakeOutputByPatient(patientId);
      res.json(intakeOutput);
    } catch (error) {
      console.error('Error fetching intake/output:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/patients/:patientId/intake-output", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const { type, category, amount, description } = req.body;
      const user = (req as any).user;

      const intakeOutputData = {
        patientId,
        type,
        category,
        amount,
        description,
        recordedBy: user.username,
      };

      const intakeOutput = await storage.createIntakeOutput(intakeOutputData);
      res.status(201).json(intakeOutput);
    } catch (error) {
      console.error('Error creating intake/output:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update intake/output record (admin only)
  app.put("/api/admin/intake-output/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { type, category, amount, description, recordedAt, recordedBy } = req.body;
      const user = (req as any).user;

      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const updateData = {
        type,
        category,
        amount,
        description,
        recordedAt,
        recordedBy,
      };

      const updatedRecord = await storage.updateIntakeOutput(id, updateData);
      if (!updatedRecord) {
        return res.status(404).json({ message: "Intake/output record not found" });
      }

      res.json(updatedRecord);
    } catch (error) {
      console.error('Error updating intake/output record:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete intake/output record (instructor/admin only)
  app.delete("/api/intake-output/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { pin } = req.body;
      const user = (req as any).user;

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      // Validate PIN for instructors (admins don't need PIN)
      if (user.role === 'instructor' && pin !== "112794") {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      const success = await storage.deleteIntakeOutput(id);
      if (!success) {
        return res.status(404).json({ message: "Intake/output record not found" });
      }

      res.json({ message: "Intake/output record deleted successfully" });
    } catch (error) {
      console.error('Error deleting intake/output record:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Assessments endpoints
  app.get("/api/patients/:patientId/assessments", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const assessments = await storage.getAssessmentsByPatient(patientId);
      res.json(assessments);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/patients/:patientId/assessments", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const { assessmentType, score, description, findings } = req.body;
      const user = (req as any).user;

      const assessmentData = {
        patientId,
        assessmentType,
        score,
        description,
        findings,
        assessedBy: user.username,
      };

      const assessment = await storage.createAssessment(assessmentData);
      res.status(201).json(assessment);
    } catch (error) {
      console.error('Error creating assessment:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update assessment record (admin only)
  app.put("/api/admin/assessments/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { assessmentType, score, description, findings, assessedAt, assessedBy } = req.body;
      const user = (req as any).user;

      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const updateData = {
        assessmentType,
        score,
        description,
        findings,
        assessedAt,
        assessedBy,
      };

      const updatedRecord = await storage.updateAssessment(id, updateData);
      if (!updatedRecord) {
        return res.status(404).json({ message: "Assessment record not found" });
      }

      res.json(updatedRecord);
    } catch (error) {
      console.error('Error updating assessment record:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update patient record (admin only)
  app.put("/api/admin/patients/:id", requireAuth, async (req, res) => {
    console.log('🔥 ADMIN PATIENT UPDATE ROUTE HIT - ID:', req.params.id);
    console.log('🔥 RAW REQUEST BODY:', JSON.stringify(req.body, null, 2));
    
    try {
      const user = (req as any).user;

      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      // Don't send createdAt field to database for updates - it should be immutable
      const { createdAt, ...updateFields } = req.body;
      
      const updateData = { 
        ...updateFields,
        chartData: req.body.chartData ? JSON.stringify(req.body.chartData) : req.body.chartData
      };
      
      console.log('🔥 PROCESSED UPDATE DATA (no createdAt):', JSON.stringify(updateData, null, 2));
      console.log('🔥 CHECKING FIELD TYPES:');
      Object.entries(updateData).forEach(([key, value]) => {
        console.log(`  ${key}: ${typeof value} = ${value}`);
      });
      
      const updatedRecord = await storage.updatePatient(req.params.id, updateData, user.id);
      if (!updatedRecord) {
        return res.status(404).json({ message: "Patient record not found" });
      }

      console.log('🔥 UPDATE SUCCESS:', updatedRecord);
      res.json(updatedRecord);
    } catch (error) {
      console.error('🔥 ERROR updating patient:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete assessment record (instructor/admin only)
  app.delete("/api/assessments/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { pin } = req.body;
      const user = (req as any).user;

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      // Validate PIN for instructors (admins don't need PIN)
      if (user.role === 'instructor' && pin !== "112794") {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      const success = await storage.deleteAssessment(id);
      if (!success) {
        return res.status(404).json({ message: "Assessment record not found" });
      }

      res.json({ message: "Assessment record deleted successfully" });
    } catch (error) {
      console.error('Error deleting assessment record:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Image upload configuration for patient imaging
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

  // Imaging results endpoints
  app.get("/api/patients/:patientId/imaging-results", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      
      // Set headers to prevent caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const imagingResults = await db.select().from(imagingFiles).where(eq(imagingFiles.patientId, patientId));
      res.json(imagingResults);
    } catch (error) {
      console.error('Error fetching imaging results:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/patients/:patientId/imaging-results", imageUpload.array('images', 5), requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const { studyType, studyDate, bodyPart, orderingPhysician, findings, impression } = req.body;
      const user = (req as any).user;

      console.log('Patient imaging upload - Files received:', req.files);
      console.log('Patient imaging upload - Body data:', req.body);

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only instructors and admins can create imaging results." });
      }

      if (!studyType || !studyDate || !bodyPart || !orderingPhysician) {
        return res.status(400).json({ message: "Missing required fields: studyType, studyDate, bodyPart, orderingPhysician" });
      }

      // Handle uploaded images
      const files = req.files as Express.Multer.File[];
      const imageUrl = files && files.length > 0 ? `/uploads/images/${files[0].filename}` : null;

      // Parse the study date more safely  
      let parsedStudyDate;
      try {
        // Handle different date formats (YYYY-MM-DD, etc.)
        if (typeof studyDate === 'string') {
          // If it's a date string like "2025-09-09", create a proper date
          const dateParts = studyDate.split('-');
          if (dateParts.length === 3) {
            parsedStudyDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          } else {
            parsedStudyDate = new Date(studyDate);
          }
        } else {
          parsedStudyDate = new Date(studyDate);
        }
        
        // Validate the date
        if (isNaN(parsedStudyDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (dateError) {
        console.error('Date parsing error:', dateError);
        return res.status(400).json({ message: "Invalid study date format" });
      }

      const imagingData = {
        id: randomUUID(),
        patientId,
        studyType,
        studyDescription: `${studyType} - ${bodyPart}`, // Generate description from type and body part
        studyDate: parsedStudyDate,
        bodyPart,
        findings: findings || '',
        impression: impression || '',
        reportedBy: orderingPhysician, // Use ordering physician as reporter
        imageUrl,
        // Don't include createdAt - let the database default handle it
      };

      console.log('Final imaging data before database insert:', imagingData);
      console.log('studyDate type and value:', typeof imagingData.studyDate, imagingData.studyDate);

      const [newImagingResult] = await db.insert(imagingFiles).values(imagingData).returning();

      console.log('Patient imaging created successfully:', newImagingResult);
      res.status(201).json(newImagingResult);
    } catch (error) {
      console.error('Error creating patient imaging result:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/imaging-results/:imagingResultId", (req, res, next) => {
    console.log('🚨 IMAGING DELETE ROUTE HIT - URL:', req.url, 'Params:', req.params);
    next();
  }, requireAuth, async (req, res) => {
    try {
      const { imagingResultId } = req.params;
      const { pin } = req.body;
      const user = (req as any).user;

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      // Validate PIN for instructor, skip for admin
      if (user.role === 'instructor' && pin !== "112794" && pin !== "0000") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }

      console.log('🔧 About to call storage.deleteImagingResult from patient route');
      const deleted = await storage.deleteImagingResult(imagingResultId);
      console.log('🔧 Storage function returned from patient route:', deleted);
      if (!deleted) {
        return res.status(404).json({ message: "Imaging result not found" });
      }

      res.json({ message: "Imaging result deleted successfully" });
    } catch (error) {
      console.error('Error deleting imaging result:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin imaging results deletion
  app.delete("/api/admin/imaging-results/:imagingResultId", requireAuth, async (req, res) => {
    try {
      const { imagingResultId } = req.params;
      const user = (req as any).user;

      console.log('🚨 ADMIN IMAGING DELETE ROUTE HIT - ID:', imagingResultId);

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      console.log('🔧 About to call storage.deleteImagingResult');
      const deleted = await storage.deleteImagingResult(imagingResultId);
      console.log('🔧 Storage function returned:', deleted);
      if (!deleted) {
        return res.status(404).json({ message: "Imaging result not found" });
      }

      res.json({ message: "Imaging result deleted successfully" });
    } catch (error) {
      console.error('Error deleting imaging result:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all intake/output records (admin only)
  app.get("/api/admin/intake-output", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      
      const intakeOutputRecords = await storage.getAllIntakeOutput();
      res.json(intakeOutputRecords);
    } catch (error) {
      console.error('Error fetching intake/output records:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all assessments (admin only)
  app.get("/api/admin/assessments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      
      const assessmentRecords = await storage.getAllAssessments();
      res.json(assessmentRecords);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin delete endpoints for intake/output and assessments
  app.delete("/api/admin/intake-output/:recordId", requireAuth, async (req, res) => {
    try {
      const { recordId } = req.params;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const success = await storage.deleteIntakeOutput(recordId);
      if (!success) {
        return res.status(404).json({ message: "Intake/output record not found" });
      }

      res.json({ message: "Intake/output record deleted successfully" });
    } catch (error) {
      console.error('Error deleting intake/output record:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/assessments/:recordId", requireAuth, async (req, res) => {
    try {
      const { recordId } = req.params;
      const user = (req as any).user;

      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const success = await storage.deleteAssessment(recordId);
      if (!success) {
        return res.status(404).json({ message: "Assessment record not found" });
      }

      res.json({ message: "Assessment record deleted successfully" });
    } catch (error) {
      console.error('Error deleting assessment record:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Provider Orders endpoints
  app.get("/api/patients/:patientId/provider-orders", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const providerOrders = await storage.getProviderOrdersByPatient(patientId);
      res.json(providerOrders);
    } catch (error) {
      console.error("Error fetching provider orders:", error);
      res.status(500).json({ message: "Failed to fetch provider orders" });
    }
  });

  // Care Plans endpoints
  app.get("/api/patients/:patientId/care-plans", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const carePlans = await storage.getCarePlansByPatient(patientId);
      res.json(carePlans);
    } catch (error) {
      console.error("Error fetching care plans:", error);
      res.status(500).json({ message: "Failed to fetch care plans" });
    }
  });

  app.post("/api/patients/:patientId/care-plans", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.params;
      const user = (req as any).user;
      
      const careplanData = {
        ...req.body,
        patientId,
        createdBy: user.id,
      };
      
      const newCarePlan = await storage.createCarePlan(careplanData);
      res.status(201).json(newCarePlan);
    } catch (error) {
      console.error("Error creating care plan:", error);
      res.status(500).json({ message: "Failed to create care plan" });
    }
  });

  app.delete("/api/patients/:patientId/care-plans/:planId", requireAuth, async (req, res) => {
    try {
      const { planId } = req.params;
      const { pin } = req.body;
      const user = (req as any).user;

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Only instructors and admins can delete care plans." });
      }

      // For instructors, verify PIN
      if (user.role === 'instructor') {
        if (!pin || pin !== "1234") {
          return res.status(401).json({ message: "Invalid PIN code" });
        }
      }

      await storage.deleteCarePlan(planId);
      res.status(200).json({ message: "Care plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting care plan:", error);
      res.status(500).json({ message: "Failed to delete care plan" });
    }
  });

  // Register admin routes (with authentication required)
  app.use('/api/admin', requireAuth, adminRoutes);

  // Clean up null ID records endpoint
  app.post('/api/admin/cleanup-null-records', requireAuth, async (req, res) => {
    try {
      console.log('Starting cleanup of null ID records...');
      
      // Get all intake/output records and filter out null IDs
      const allIntakeOutput = await storage.getAllIntakeOutput();
      const validIntakeOutput = allIntakeOutput.filter(record => record.id !== null && record.id !== undefined);
      console.log(`Found ${allIntakeOutput.length} total intake/output records, ${validIntakeOutput.length} valid`);
      
      // Get all assessment records and filter out null IDs
      const allAssessments = await storage.getAllAssessments();
      const validAssessments = allAssessments.filter(record => record.id !== null && record.id !== undefined);
      console.log(`Found ${allAssessments.length} total assessment records, ${validAssessments.length} valid`);
      
      // Clear and re-insert only valid records
      await storage.deleteAllIntakeOutput();
      await storage.deleteAllAssessments();
      
      // Re-insert valid records
      for (const record of validIntakeOutput) {
        await storage.createIntakeOutput(record);
      }
      for (const record of validAssessments) {
        await storage.createAssessment(record);
      }
      
      console.log('Cleanup completed successfully');
      res.json({ 
        message: 'Null ID records cleaned up successfully',
        cleaned: {
          intakeOutput: allIntakeOutput.length - validIntakeOutput.length,
          assessments: allAssessments.length - validAssessments.length
        }
      });
    } catch (error) {
      console.error('Error during null record cleanup:', error);
      res.status(500).json({ message: 'Cleanup failed', error: error.message });
    }
  });

  // Import medications from Excel file
  app.post('/api/admin/import-medications', requireAuth, async (req, res) => {
    try {
      const filePath = 'attached_assets/Maternal-Neonatal Meds_1757454565823.xlsx';
      
      console.log('Reading Excel file:', filePath);
      
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('Found medications in Excel:', data.length);
      console.log('Sample medication:', data[0]);
      
      // Clear existing medications
      await db.delete(medicines);
      
      // Insert new medications with 8-digit IDs starting from 10000001
      const newMedications = data.map((med: any, index) => {
        const id = (10000001 + index).toString();
        
        // Try different possible column names
        const name = med['Medication Name'] || med['Name'] || med['Drug'] || med['Medicine'] || `Unknown ${index + 1}`;
        const drawer = med['Drawer'] || med['Location'] || 'A1';
        const bin = med['Bin'] || med['Bin #'] || med['Bin Number'] || (index + 1).toString();
        const dosage = med['Dosage'] || med['Dose'] || med['Standard Dose'] || 'Standard dose';
        const category = med['Category'] || med['Type'] || med['Classification'] || null;
        const isNarcotic = (med['Narcotic'] === 'Yes' || med['Controlled'] === 'Yes' || med['Controlled Substance'] === 'Yes') ? 1 : 0;
        const dose = med['Dose'] || med['Strength'] || med['Amount'] || dosage;
        const route = med['Route'] || med['Administration'] || med['Method'] || 'PO';
        const frequency = med['Frequency'] || med['Schedule'] || med['Timing'] || 'once daily';
        const isPrn = (med['PRN'] === 'Yes' || med['As Needed'] === 'Yes' || med['PRN/As Needed'] === 'Yes') ? 1 : 0;
        
        return {
          id,
          name: name.toString().slice(0, 255), // Truncate if too long
          drawer: drawer.toString().slice(0, 10),
          bin: bin.toString().slice(0, 10),
          dosage: dosage.toString().slice(0, 255),
          category: category ? category.toString().slice(0, 100) : null,
          isNarcotic,
          dose: dose.toString().slice(0, 255),
          route: route.toString().slice(0, 50),
          frequency: frequency.toString().slice(0, 100),
          isPrn
        };
      });
      
      // Insert all new medications
      if (newMedications.length > 0) {
        await db.insert(medicines).values(newMedications);
      }
      
      console.log(`Successfully imported ${newMedications.length} medications with IDs starting from 10000001`);
      
      res.json({
        message: 'Medications imported successfully',
        count: newMedications.length,
        startId: '10000001',
        endId: (10000001 + newMedications.length - 1).toString()
      });
      
    } catch (error) {
      console.error('Error importing medications:', error);
      res.status(500).json({ 
        message: 'Failed to import medications',
        error: error.message
      });
    }
  });

  // Delete individual audit log (instructor/admin only)
  app.delete("/api/audit-logs/:auditLogId", requireAuth, async (req, res) => {
    try {
      const { auditLogId } = req.params;
      const { pin } = req.body;
      const user = (req as any).user;

      // Check if user is instructor or admin
      if (user.role !== 'instructor' && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      // Validate PIN for instructor, skip for admin
      if (user.role === 'instructor' && pin !== "112794" && pin !== "0000") {
        return res.status(401).json({ message: "Invalid PIN code" });
      }

      const deleted = await storage.deleteAuditLog(auditLogId);
      if (!deleted) {
        return res.status(404).json({ message: "Audit log not found" });
      }

      res.json({ message: "Audit log deleted successfully" });
    } catch (error) {
      console.error('Error deleting audit log:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
