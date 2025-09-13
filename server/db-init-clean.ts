import { db } from "./db";
import { sql } from "drizzle-orm";

export async function initializeDatabase() {
  try {
    console.log("🗄️  Initializing SQLite database...");

    // Create tables
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dob TEXT NOT NULL,
        age INTEGER NOT NULL,
        dose_weight TEXT NOT NULL,
        sex TEXT NOT NULL,
        mrn TEXT NOT NULL,
        fin TEXT NOT NULL,
        admitted TEXT NOT NULL,
        isolation TEXT NOT NULL,
        bed TEXT NOT NULL,
        allergies TEXT NOT NULL,
        status TEXT NOT NULL,
        provider TEXT NOT NULL,
        notes TEXT NOT NULL,
        department TEXT NOT NULL,
        chart_data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        drawer TEXT NOT NULL DEFAULT 'A1',
        bin TEXT NOT NULL DEFAULT '01',
        dosage TEXT NOT NULL DEFAULT 'Standard dose',
        category TEXT DEFAULT 'general',
        is_narcotic INTEGER NOT NULL DEFAULT 0,
        dose TEXT NOT NULL DEFAULT 'Standard dose',
        route TEXT NOT NULL DEFAULT 'PO',
        frequency TEXT NOT NULL DEFAULT 'As Needed'
      )
    `);

    // Add new columns to existing medicines table if they don't exist
    try {
      await db.run(sql`ALTER TABLE medicines ADD COLUMN is_narcotic INTEGER NOT NULL DEFAULT 0`);
    } catch (error) {
      // Column already exists, continue
    }
    
    try {
      await db.run(sql`ALTER TABLE medicines ADD COLUMN dose TEXT NOT NULL DEFAULT 'Standard dose'`);
    } catch (error) {
      // Column already exists, continue  
    }
    
    try {
      await db.run(sql`ALTER TABLE medicines ADD COLUMN route TEXT NOT NULL DEFAULT 'PO'`);
    } catch (error) {
      // Column already exists, continue
    }
    
    try {
      await db.run(sql`ALTER TABLE medicines ADD COLUMN frequency TEXT NOT NULL DEFAULT 'Daily'`);
    } catch (error) {
      // Column already exists, continue
    }

    try {
      await db.run(sql`ALTER TABLE medicines ADD COLUMN is_prn INTEGER NOT NULL DEFAULT 0`);
    } catch (error) {
      // Column already exists, continue
    }

    // Update existing medicines with new drawer/bin assignments (use INSERT OR REPLACE to handle existing records)

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        medicine_id TEXT NOT NULL,
        dosage TEXT NOT NULL,
        periodicity TEXT NOT NULL,
        duration TEXT,
        route TEXT NOT NULL DEFAULT 'Oral',
        start_date TEXT,
        end_date TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (medicine_id) REFERENCES medicines(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS administrations (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        medicine_id TEXT NOT NULL,
        administered_at TEXT DEFAULT (datetime('now')),
        administered_by TEXT,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (medicine_id) REFERENCES medicines(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        pin TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changes TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        user_id TEXT
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS lab_test_types (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT,
        unit TEXT,
        reference_range TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS lab_results (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        test_name TEXT NOT NULL,
        test_code TEXT,
        value TEXT NOT NULL,
        unit TEXT,
        reference_range TEXT,
        status TEXT NOT NULL,
        taken_at TEXT NOT NULL,
        resulted_at TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS vitals (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        pulse INTEGER NOT NULL,
        temperature TEXT NOT NULL,
        respiration_rate INTEGER NOT NULL,
        blood_pressure_systolic INTEGER NOT NULL,
        blood_pressure_diastolic INTEGER NOT NULL,
        oxygen_saturation INTEGER,
        notes TEXT,
        taken_at TEXT DEFAULT (datetime('now')),
        taken_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS care_notes (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS provider_orders (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        order_type TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        ordered_by TEXT NOT NULL,
        ordered_at TEXT DEFAULT (datetime('now')),
        discontinued_at TEXT,
        discontinued_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS intake_output (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        recorded_at TEXT DEFAULT (datetime('now')),
        recorded_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        assessment_type TEXT NOT NULL,
        score INTEGER,
        description TEXT,
        findings TEXT,
        assessed_at TEXT DEFAULT (datetime('now')),
        assessed_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS imaging_files (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        study_type TEXT NOT NULL,
        study_description TEXT NOT NULL,
        body_part TEXT,
        findings TEXT,
        impression TEXT,
        study_date TEXT NOT NULL,
        reported_by TEXT,
        image_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS care_plans (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        problem TEXT NOT NULL,
        goal TEXT NOT NULL,
        interventions TEXT NOT NULL,
        evaluation TEXT,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    console.log("✅ Database tables created successfully!");

    // Insert sample data
    // Sample patient data removed

    await db.run(sql`
      INSERT OR REPLACE INTO medicines (id, name, drawer, bin, dosage, category, is_narcotic, dose, route, frequency, is_prn) VALUES 
      -- Drawer A1: Over-the-counter and basic care medications (Bins 01-20) - Each ID gets unique bin
      ('10000001', 'Acetaminophen', 'A1', '01', '650mg', 'pain-killer', 0, '650mg', 'PO', 'Every 6 hrs', 1),
      ('10000002', 'Acetaminophen', 'A1', '02', '1000mg PO q6h PRN', 'pain-killer', 0, '1000mg', 'PO', 'Every 6 hrs', 1),
      ('10000003', 'Acetaminophen', 'A1', '03', '1000mg IV q6h PRN', 'pain-killer', 0, '1000mg', 'IV', 'Every 6 hrs', 1),
      ('10000004', 'Ibuprofen/Motrin', 'A1', '04', '600mg PO q6h PRN', 'pain-killer', 0, '600mg', 'PO', 'Every 6 hrs', 1),
      ('10000005', 'Toradol', 'A1', '05', '30mg IVP q6h PRN', 'pain-killer', 0, '30mg', 'IV', 'Every 6 hrs', 1),
      ('10000018', 'Colace/Docusate sodium', 'A1', '06', '100mg PO BID', 'general', 0, '100mg', 'PO', 'Twice daily', 0),
      ('10000019', 'Dulcolax', 'A1', '07', '10mg PO daily PRN', 'general', 0, '10mg', 'PO', 'Daily', 1),
      ('10000020', 'Senokot', 'A1', '08', '8.6mg PO BID PRN', 'general', 0, '8.6mg', 'PO', 'Twice daily', 1),
      ('10000021', 'Mylicon', 'A1', '09', '40mg PO q4h PRN', 'general', 0, '40mg', 'PO', 'Every 4 hrs', 1),
      ('10000047', 'Ferrous sulfate', 'A1', '10', '325mg PO daily', 'general', 0, '325mg', 'PO', 'Daily', 0),
      ('10000048', 'Prenatal vitamin', 'A1', '11', '1 tablet PO daily', 'general', 0, '1 tablet', 'PO', 'Daily', 0),
      ('10000049', 'Aqua-mephyton (Vitamin K)', 'A1', '12', '1mg IM newborn', 'general', 0, '1mg', 'IM', 'Once', 0),
      ('10000059', 'Dermoplast spray', 'A1', '13', 'Standard dose Topical PRN', 'general', 0, 'Standard', 'Topical', 'As Needed', 1),
      ('10000062', 'EMLA cream', 'A1', '14', 'Topical 60min pre-procedure', 'general', 0, 'Standard', 'Topical', 'Pre-procedure', 0),
      ('10000053', 'Erythromycin ointment', 'A1', '15', 'Both eyes Topical once', 'general', 0, 'Standard', 'Topical', 'Once', 0),
      ('10000041', 'Tdap vaccine', 'A1', '16', '0.5mL IM once', 'general', 0, '0.5mL', 'IM', 'Once', 0),
      ('10000042', 'Flu vaccine', 'A1', '17', '0.5mL IM annually', 'general', 0, '0.5mL', 'IM', 'Annually', 0),
      ('10000043', 'Rhogam', 'A1', '18', '300mcg IM', 'general', 0, '300mcg', 'IM', 'Once', 0),
      ('10000044', 'Rubella vaccine', 'A1', '19', '0.5mL SC postpartum', 'general', 0, '0.5mL', 'SC', 'Once', 0),
      ('10000045', 'Energix/Hepatitis B vaccine', 'A1', '20', '1mL IM x3', 'general', 0, '1mL', 'IM', 'Series', 0),
      
      -- Drawer A2: IV medications and emergency drugs (Bins 01-20) - Each ID gets unique bin
      ('10000046', 'Hepatitis B vaccine newborn', 'A2', '01', '0.5mL IM', 'general', 0, '0.5mL', 'IM', 'Once', 0),
      ('10000063', 'Glucose Gel (sweet cheeks)', 'A2', '02', 'Weight based: Buccal PRN low blood sugar PRN', 'general', 0, 'Weight based', 'Buccal', 'As Needed', 1),
      ('10000064', 'Penicillin', 'A2', '03', '5 million units IV once', 'general', 0, '5 million units', 'IV', 'Once', 0),
      ('10000065', 'Ampicillin', 'A2', '04', '2gram loading dose IV once', 'general', 0, '2g', 'IV', 'Once', 0),
      ('10000031', 'Labetalol', 'A2', '05', '20mg IVP initial', 'general', 0, '20mg', 'IV', 'initial dose', 0),
      ('10000032', 'Labetalol', 'A2', '06', '200mg PO twice daily', 'general', 0, '200mg', 'PO', 'Twice daily', 0),
      ('10000033', 'Labetalol', 'A2', '07', '40-80mg IVP q10min', 'general', 0, '40-80mg', 'IV', 'q10min', 0),
      ('10000034', 'Nifedipine', 'A2', '08', '10mg PO q20min x3', 'general', 0, '10mg', 'PO', 'q20min', 0),
      ('10000035', 'Nifedipine', 'A2', '09', '20mg PO q4-6h', 'general', 0, '20mg', 'PO', 'Every 4-6 hrs', 0),
      ('10000036', 'Aldomet', 'A2', '10', '250mg PO q6h', 'general', 0, '250mg', 'PO', 'Every 6 hrs', 0),
      ('10000039', 'Ephedrine', 'A2', '11', '5mg IV PRN', 'general', 0, '5mg', 'IV', 'As Needed', 1),
      ('10000040', 'Ephedrine', 'A2', '12', '10mg IV PRN', 'general', 0, '10mg', 'IV', 'As Needed', 1),
      ('10000022', 'Pitocin', 'A2', '13', '10 units/1000mL IV infusion', 'general', 0, '10 units/1000mL', 'IV', 'continuous infusion', 0),
      ('10000023', 'Methergine', 'A2', '14', '0.2mg PO q8h', 'general', 0, '0.2mg', 'PO', 'Every 8 hrs', 0),
      ('10000024', 'Methergine', 'A2', '15', '0.2mg IM q2-4h PRN', 'general', 0, '0.2mg', 'IM', 'Every 2-4 hrs', 1),
      ('10000025', 'Hemabate', 'A2', '16', '250mcg IM q15-90min PRN', 'general', 0, '250mcg', 'IM', 'q15-90min', 1),
      ('10000026', 'Cytotec', 'A2', '17', '400mcg PO q4h', 'general', 0, '400mcg', 'PO', 'Every 4 hrs', 0),
      ('10000027', 'Cytotec', 'A2', '18', '400mcg PR q4h', 'general', 0, '400mcg', 'PR', 'Every 4 hrs', 0),
      ('10000028', 'Cervidil', 'A2', '19', '10mg Vaginal insert q12h', 'general', 0, '10mg', 'Vaginal', 'Every 12 hrs', 0),
      ('10000029', 'Prepidil gel', 'A2', '20', '0.5mg Intracervical q6h', 'general', 0, '0.5mg', 'Intracervical', 'Every 6 hrs', 0),
      
      -- Drawer B1: Anesthetics and local medications (Bins 01-20) - Each ID gets unique bin  
      ('10000030', 'Terbutaline', 'B1', '01', '0.25mg SC q20min x3', 'general', 0, '0.25mg', 'SC', 'q20min', 0),
      ('10000037', 'Magnesium sulfate', 'B1', '02', '4g IV Loading dose/Bolus dose', 'general', 0, '4g', 'IV', 'loading dose', 0),
      ('10000038', 'Magnesium sulfate', 'B1', '03', '2g/hr IV', 'general', 0, '2g/hr', 'IV', 'continuous', 0),
      ('10000051', 'Calcium gluconate', 'B1', '04', '1g IV over 10min', 'general', 0, '1g', 'IV', 'over 10min', 0),
      ('10000052', 'Betamethasone', 'B1', '05', '12mg IM q24h x2', 'general', 0, '12mg', 'IM', 'Every 24 hrs', 0),
      ('10000054', 'Indocin', 'B1', '06', '50mg PO q6h x8', 'general', 0, '50mg', 'PO', 'Every 6 hrs', 0),
      ('10000058', 'Tranexamic acid', 'B1', '07', '1g IV over 10min', 'general', 0, '1g', 'IV', 'over 10min', 0),
      ('10000060', 'Lidocaine', 'B1', '08', '1% Solution Local anesthesia', 'general', 0, '1%', 'Local injection', 'As Needed', 1),
      ('10000061', 'Lidocaine', 'B1', '09', '2% Solution Local anesthesia', 'general', 0, '2%', 'Local injection', 'As Needed', 1),
      
      -- Drawer B2: Narcotics and controlled substances (Bins 01-20) - Each ID gets unique bin
      ('10000008', 'Morphine', 'B2', '01', '2mg IVP q2-4h PRN', 'pain-killer', 1, '2mg', 'IV', 'Every 2-4 hrs', 1),
      ('10000009', 'Morphine', 'B2', '02', '4mg IVP q2-4h PRN', 'pain-killer', 1, '4mg', 'IV', 'Every 2-4 hrs', 1),
      ('10000010', 'Fentanyl', 'B2', '03', '50mcg IVP q2h PRN', 'pain-killer', 1, '50mcg', 'IV', 'Every 2 hrs', 1),
      ('10000011', 'Fentanyl', 'B2', '04', '100mcg IVP q2h PRN', 'pain-killer', 1, '100mcg', 'IV', 'Every 2 hrs', 1),
      ('10000006', 'Oxycodone/Percocet', 'B2', '05', '5mg PO q4-6h PRN', 'pain-killer', 1, '5mg', 'PO', 'Every 4-6 hrs', 1),
      ('10000007', 'Oxycodone/Percocet', 'B2', '06', '10mg PO q4-6h PRN', 'pain-killer', 1, '10mg', 'PO', 'Every 4-6 hrs', 1),
      ('10000012', 'Nubain', 'B2', '07', '10mg IVP q4h PRN', 'pain-killer', 1, '10mg', 'IV', 'Every 4 hrs', 1),
      ('10000013', 'Nubain', 'B2', '08', '10mg IM q4h PRN', 'pain-killer', 1, '10mg', 'IM', 'Every 4 hrs', 1),
      ('10000014', 'Stadol', 'B2', '09', '1mg IVP q4h PRN', 'pain-killer', 1, '1mg', 'IV', 'Every 4 hrs', 1),
      ('10000015', 'Stadol', 'B2', '10', '2mg IVP q4h PRN', 'pain-killer', 1, '2mg', 'IV', 'Every 4 hrs', 1),
      ('10000016', 'Stadol', 'B2', '11', '1mg IM q4h PRN', 'pain-killer', 1, '1mg', 'IM', 'Every 4 hrs', 1),
      ('10000017', 'Stadol', 'B2', '12', '2mg IM q4h PRN', 'pain-killer', 1, '2mg', 'IM', 'Every 4 hrs', 1),
      ('10000055', 'Methadone', 'B2', '13', 'Individualized', 'pain-killer', 1, 'Individualized', 'PO', 'individualized', 0),
      ('10000056', 'Subutex/Buprenorphine', 'B2', '14', 'Individualized', 'pain-killer', 1, 'Individualized', 'SL', 'individualized', 0),
      ('10000057', 'Suboxone', 'B2', '15', 'Individualized', 'pain-killer', 1, 'Individualized', 'SL', 'individualized', 0),
      ('10000050', 'Narcan', 'B2', '16', '0.4mg IVP PRN', 'pain-killer', 1, '0.4mg', 'IV', 'As Needed', 1)
    `);

    await db.run(sql`
      INSERT OR IGNORE INTO users (id, username, pin, role, created_at) 
      VALUES ('admin-001', 'admin', '0000', 'admin', datetime('now'))
    `);
    
    await db.run(sql`
      INSERT OR IGNORE INTO users (id, username, pin, role, created_at) 
      VALUES ('instructor-001', 'instructor', '112794', 'instructor', datetime('now'))
    `);

    await db.run(sql`
      INSERT OR IGNORE INTO users (id, username, pin, role, created_at) 
      VALUES ('student-001', 'student1', '112233', 'student', datetime('now'))
    `);

    // Insert lab test types for maternal-neonatal care
    await db.run(sql`
      INSERT OR IGNORE INTO lab_test_types (id, code, name, category, unit, reference_range, is_active, created_at) VALUES 
      ('lab-001', 'CBC', 'Complete Blood Count', 'Hematology', 'Various', 'See individual components', 1, datetime('now')),
      ('lab-002', 'HGB', 'Hemoglobin', 'Hematology', 'g/dL', '12.0-16.0 (Female)', 1, datetime('now')),
      ('lab-003', 'HCT', 'Hematocrit', 'Hematology', '%', '36-46 (Female)', 1, datetime('now')),
      ('lab-004', 'PLT', 'Platelet Count', 'Hematology', 'K/μL', '150-450', 1, datetime('now')),
      ('lab-005', 'BMP', 'Basic Metabolic Panel', 'Chemistry', 'Various', 'See individual components', 1, datetime('now')),
      ('lab-006', 'GLU', 'Glucose', 'Chemistry', 'mg/dL', '70-100 (Fasting)', 1, datetime('now')),
      ('lab-007', 'BUN', 'Blood Urea Nitrogen', 'Chemistry', 'mg/dL', '6-20', 1, datetime('now')),
      ('lab-008', 'CREAT', 'Creatinine', 'Chemistry', 'mg/dL', '0.6-1.2 (Female)', 1, datetime('now')),
      ('lab-009', 'HCG', 'Beta hCG (Pregnancy Test)', 'Endocrinology', 'mIU/mL', '<5 (Non-pregnant)', 1, datetime('now')),
      ('lab-010', 'TSH', 'Thyroid Stimulating Hormone', 'Endocrinology', 'μIU/mL', '0.5-5.0', 1, datetime('now')),
      ('lab-011', 'PT-INR', 'Prothrombin Time/INR', 'Coagulation', 'seconds/ratio', '11-13 sec / 0.8-1.2', 1, datetime('now')),
      ('lab-012', 'PTT', 'Partial Thromboplastin Time', 'Coagulation', 'seconds', '25-35', 1, datetime('now')),
      ('lab-013', 'UA', 'Urinalysis', 'Urinalysis', 'Various', 'See individual components', 1, datetime('now')),
      ('lab-014', 'PROT-U', 'Urine Protein', 'Urinalysis', 'mg/dL', 'Negative to trace', 1, datetime('now')),
      ('lab-015', 'GBS', 'Group B Strep Culture', 'Microbiology', 'Qualitative', 'Negative', 1, datetime('now'))
    `);

    console.log("✅ Sample data inserted successfully!");
    console.log("👤 Default users created:");
    console.log("   - Admin (Username: admin, PIN: 0000)");
    console.log("   - Instructor (Username: instructor, PIN: 112794)");
    console.log("   - Student (Username: student1, PIN: 112233)");
    console.log("🧪 Lab test types loaded for maternal-neonatal care");

  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}