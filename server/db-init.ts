import { db } from "./db";
import { sql } from "drizzle-orm";
import * as schema from "@shared/schema";

export async function initializeDatabase() {
  try {
    console.log("🗄️  Initializing PostgreSQL database...");

    // Tables will be created automatically when we first use them with Drizzle
    // Drizzle handles the schema for us, no need to manually create tables

    console.log("✅ Database tables created successfully!");

    // Insert default users using Drizzle insert method with onConflictDoNothing
    try {
      await db.insert(schema.users).values([
        { id: 'admin-001', username: 'admin', pin: '0000', role: 'admin' },
        { id: 'instructor-001', username: 'instructor', pin: '112794', role: 'instructor' },
        { id: 'student-001', username: 'student1', pin: '112233', role: 'student' },
        { id: 'student-002', username: 'student2', pin: '112234', role: 'student' }
      ]).onConflictDoNothing();
    } catch (error: any) {
      // Ignore duplicate key errors
      if (!error.message?.includes('duplicate')) {
        throw error;
      }
    }

    // Sample patient data removed

    // Purge any existing invalid medicine IDs (non-10000xxx format) from database
    try {
      console.log("🧹 Purging invalid medicine IDs from database...");
      await db.execute(sql`DELETE FROM medicines WHERE id NOT LIKE '10000%'`);
      await db.execute(sql`DELETE FROM prescriptions WHERE medicine_id NOT LIKE '10000%'`);
      await db.execute(sql`DELETE FROM administrations WHERE medicine_id NOT LIKE '10000%'`);
      console.log("✅ Invalid medicine IDs purged from database");
    } catch (error) {
      console.log("⚠️  Purge failed (tables may not exist yet):", error.message);
    }

    // Medicine auto-seeding disabled to prevent old ID format conflicts
    // Users should add medicines through the admin interface with 10000XXX format
    console.log("💊 Medicine auto-seeding disabled - use admin interface to add medicines with 10000XXX format");

    // Fix prescription completion status based on administration history
    try {
      console.log("🔧 Fixing prescription completion status...");
      
      // Mark "Once" prescriptions as complete if they have been administered
      await db.execute(sql`
        UPDATE prescriptions 
        SET completed = 1 
        WHERE periodicity = 'Once' 
        AND medicine_id IN (
          SELECT DISTINCT medicine_id 
          FROM administrations 
          WHERE status = 'administered'
        )
      `);
      
      console.log("✅ Prescription completion status fixed");
    } catch (error) {
      console.error("❌ Error fixing prescription completion:", error);
    }

    console.log("✅ Sample data inserted successfully!");
    console.log("👤 Default users created:");
    console.log("   - Admin (Username: admin, PIN: 0000)");
    console.log("   - Instructor (Username: instructor, PIN: 112794)");
    console.log("   - Student (Username: student1, PIN: 112233)");

    // Insert lab test types for maternal-neonatal care
    const labTestTypes = [
      { id: 'cbc-001', code: 'CBC-HGB', name: 'Complete Blood Count - Hemoglobin', category: 'Hematology', unit: 'g/dL', referenceRange: '12.0-16.0 g/dL' },
      { id: 'bmp-001', code: 'BMP-GLU', name: 'Basic Metabolic Panel - Glucose', category: 'Chemistry', unit: 'mg/dL', referenceRange: '70-99 mg/dL' },
      { id: 'bmp-002', code: 'BMP-BUN', name: 'Basic Metabolic Panel - Blood Urea Nitrogen', category: 'Chemistry', unit: 'mg/dL', referenceRange: '7-18 mg/dL' },
      { id: 'bmp-003', code: 'BMP-CR', name: 'Basic Metabolic Panel - Creatinine', category: 'Chemistry', unit: 'mg/dL', referenceRange: '0.6-1.2 mg/dL' },
      { id: 'coag-001', code: 'PT', name: 'Prothrombin Time', category: 'Coagulation', unit: 'seconds', referenceRange: '11-13 seconds' },
      { id: 'coag-002', code: 'PTT', name: 'Partial Thromboplastin Time', category: 'Coagulation', unit: 'seconds', referenceRange: '25-35 seconds' }
    ];

    try {
      await db.insert(schema.labTestTypes).values(labTestTypes).onConflictDoNothing();
      console.log("🧪 Lab test types loaded for maternal-neonatal care");
    } catch (error) {
      if (!error.message?.includes('duplicate')) {
        throw error;
      }
    }
    
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}