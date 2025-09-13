import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseTemplateManager {
  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'database-templates');
    this.ensureTemplatesDir();
  }

  ensureTemplatesDir() {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  // Get all available database templates
  getAvailableTemplates() {
    return [
      {
        id: 'general',
        name: 'General Medicine',
        description: 'General medical practice with common medications and procedures',
        icon: '🏥',
        category: 'General',
        isDefault: true
      },
      {
        id: 'pediatrics',
        name: 'Pediatrics',
        description: 'Specialized for pediatric care with age-appropriate medications and dosages',
        icon: '👶',
        category: 'Specialty'
      },
      {
        id: 'cardiology',
        name: 'Cardiology',
        description: 'Cardiac care focused with cardiovascular medications and procedures',
        icon: '❤️',
        category: 'Specialty'
      },
      {
        id: 'labor_delivery',
        name: 'Labor & Delivery',
        description: 'Obstetric care with maternal and neonatal medications',
        icon: '👪',
        category: 'Specialty'
      },
      {
        id: 'emergency',
        name: 'Emergency Medicine',
        description: 'Emergency department with critical care medications and protocols',
        icon: '🚑',
        category: 'Specialty'
      },
      {
        id: 'surgery',
        name: 'Surgery',
        description: 'Surgical care with perioperative medications and procedures',
        icon: '🏥',
        category: 'Specialty'
      },
      {
        id: 'icu',
        name: 'Intensive Care Unit',
        description: 'Critical care with intensive monitoring and advanced medications',
        icon: '🏥',
        category: 'Specialty'
      },
      {
        id: 'oncology',
        name: 'Oncology',
        description: 'Cancer care with chemotherapy and supportive care medications',
        icon: '🎗️',
        category: 'Specialty'
      }
    ];
  }

  // Get template configuration for a specific template
  getTemplateConfig(templateId) {
    const templates = {
      general: this.getGeneralTemplate(),
      pediatrics: this.getPediatricsTemplate(),
      cardiology: this.getCardiologyTemplate(),
      labor_delivery: this.getLaborDeliveryTemplate(),
      emergency: this.getEmergencyTemplate(),
      surgery: this.getSurgeryTemplate(),
      icu: this.getICUTemplate(),
      oncology: this.getOncologyTemplate()
    };

    return templates[templateId] || templates.general;
  }

  // General Medicine Template
  getGeneralTemplate() {
    return {
      medicines: [
        { id: '31908432', name: 'Acetaminophen', drawer: 'A1', dosage: '325mg, 500mg, 650mg tablets; 80mg/mL, 160mg/5mL liquid' },
        { id: '50458550', name: 'Ibuprofen', drawer: 'A1', dosage: '200mg, 400mg, 600mg, 800mg tablets; 100mg/5mL suspension' },
        { id: '00781171', name: 'Lisinopril', drawer: 'A2', dosage: '2.5mg, 5mg, 10mg, 20mg, 40mg tablets' },
        { id: '68084033', name: 'Metformin', drawer: 'A3', dosage: '500mg, 850mg, 1000mg tablets; 500mg, 750mg, 1000mg ER tablets' },
        { id: '00093031', name: 'Atorvastatin', drawer: 'B1', dosage: '10mg, 20mg, 40mg, 80mg tablets' },
        { id: '68180051', name: 'Amlodipine', drawer: 'B2', dosage: '2.5mg, 5mg, 10mg tablets' },
        { id: '00378020', name: 'Levothyroxine', drawer: 'B3', dosage: '25mcg, 50mcg, 75mcg, 100mcg, 125mcg, 150mcg tablets' },
        { id: '68382004', name: 'Omeprazole', drawer: 'C1', dosage: '10mg, 20mg, 40mg capsules' },
        { id: '43547040', name: 'Sertraline', drawer: 'C2', dosage: '25mg, 50mg, 100mg tablets; 20mg/mL concentrate' },
        { id: '00173070', name: 'Amoxicillin', drawer: 'C3', dosage: '250mg, 500mg capsules; 125mg/5mL, 250mg/5mL suspension' }
      ],
      patients: [
        {
          id: '112233445566',
          name: 'Sarah Johnson',
          dob: '1985-03-15',
          mrn: 'MRN-001234',
          gender: 'Female',
          chartData: {
            chiefComplaint: 'Annual physical exam',
            allergies: 'NKDA',
            medicalHistory: 'Hypertension, controlled',
            currentMedications: 'Lisinopril 10mg daily'
          }
        }
      ],
      labTestTypes: [
        { id: '1', name: 'Complete Blood Count (CBC)', category: 'Hematology' },
        { id: '2', name: 'Basic Metabolic Panel (BMP)', category: 'Chemistry' },
        { id: '3', name: 'Lipid Panel', category: 'Chemistry' },
        { id: '4', name: 'Hemoglobin A1C', category: 'Chemistry' },
        { id: '5', name: 'TSH', category: 'Endocrine' }
      ]
    };
  }

  // Pediatrics Template
  getPediatricsTemplate() {
    return {
      medicines: [
        { id: '31908432', name: 'Acetaminophen (Pediatric)', drawer: 'A1', dosage: '80mg, 160mg chewables; 80mg/0.8mL, 160mg/5mL suspension' },
        { id: '50458550', name: 'Ibuprofen (Pediatric)', drawer: 'A1', dosage: '50mg, 100mg chewables; 100mg/5mL suspension' },
        { id: '00173070', name: 'Amoxicillin (Pediatric)', drawer: 'A2', dosage: '125mg/5mL, 200mg/5mL, 250mg/5mL, 400mg/5mL suspension' },
        { id: '00078012', name: 'Azithromycin (Pediatric)', drawer: 'A2', dosage: '100mg/5mL, 200mg/5mL suspension; 250mg, 500mg tablets' },
        { id: '70710109', name: 'Ceftriaxone', drawer: 'A3', dosage: '250mg, 500mg, 1g, 2g injection' },
        { id: '00409417', name: 'Albuterol', drawer: 'B1', dosage: '90mcg/actuation inhaler; 0.083%, 0.5% nebulizer solution' },
        { id: '49348005', name: 'Prednisolone', drawer: 'B2', dosage: '5mg/5mL, 15mg/5mL oral solution' },
        { id: '00904562', name: 'Ondansetron', drawer: 'B3', dosage: '2mg/5mL oral solution; 2mg, 4mg ODT' },
        { id: '63739044', name: 'Diphenhydramine (Pediatric)', drawer: 'C1', dosage: '12.5mg/5mL elixir' },
        { id: '00574705', name: 'Polyethylene Glycol 3350', drawer: 'C2', dosage: '8.5g, 17g powder packets' }
      ],
      patients: [
        {
          id: '223344556677',
          name: 'Emma Thompson',
          dob: '2018-07-22',
          mrn: 'PEDS-5678',
          gender: 'Female',
          chartData: {
            chiefComplaint: 'Well-child visit (5 years)',
            allergies: 'NKDA',
            medicalHistory: 'Born at term, normal development',
            currentMedications: 'Multivitamin daily',
            growth: 'Height: 42 inches (50th percentile), Weight: 38 lbs (45th percentile)'
          }
        }
      ],
      labTestTypes: [
        { id: '1', name: 'CBC with Differential', category: 'Hematology' },
        { id: '2', name: 'Lead Level', category: 'Toxicology' },
        { id: '3', name: 'Hemoglobin/Hematocrit', category: 'Hematology' },
        { id: '4', name: 'Strep Screen', category: 'Microbiology' },
        { id: '5', name: 'Urinalysis', category: 'Urinalysis' }
      ]
    };
  }

  // Cardiology Template
  getCardiologyTemplate() {
    return {
      medicines: [
        { id: '00781171', name: 'Lisinopril', drawer: 'A1', dosage: '2.5mg, 5mg, 10mg, 20mg, 40mg tablets' },
        { id: '68180051', name: 'Amlodipine', drawer: 'A1', dosage: '2.5mg, 5mg, 10mg tablets' },
        { id: '00093031', name: 'Atorvastatin', drawer: 'A2', dosage: '10mg, 20mg, 40mg, 80mg tablets' },
        { id: '00378415', name: 'Metoprolol', drawer: 'A2', dosage: '25mg, 50mg, 100mg tablets; 25mg, 50mg, 100mg, 200mg ER tablets' },
        { id: '55111067', name: 'Carvedilol', drawer: 'A3', dosage: '3.125mg, 6.25mg, 12.5mg, 25mg tablets' },
        { id: '68084716', name: 'Furosemide', drawer: 'B1', dosage: '20mg, 40mg, 80mg tablets; 10mg/mL oral solution' },
        { id: '00074382', name: 'Warfarin', drawer: 'B2', dosage: '1mg, 2mg, 2.5mg, 3mg, 4mg, 5mg, 6mg, 7.5mg, 10mg tablets' },
        { id: '00591346', name: 'Clopidogrel', drawer: 'B3', dosage: '75mg tablets' },
        { id: '00904641', name: 'Digoxin', drawer: 'C1', dosage: '0.125mg, 0.25mg tablets; 0.05mg/mL elixir' },
        { id: '68382045', name: 'Aspirin (Cardio)', drawer: 'C2', dosage: '81mg enteric-coated tablets' }
      ],
      patients: [
        {
          id: '334455667788',
          name: 'Robert Martinez',
          dob: '1962-11-08',
          mrn: 'CARD-9012',
          gender: 'Male',
          chartData: {
            chiefComplaint: 'Chest pain, follow-up post-MI',
            allergies: 'NKDA',
            medicalHistory: 'MI 3 months ago, hypertension, hyperlipidemia',
            currentMedications: 'Metoprolol 50mg BID, Atorvastatin 40mg daily, Clopidogrel 75mg daily'
          }
        }
      ],
      labTestTypes: [
        { id: '1', name: 'Troponin I', category: 'Cardiac Markers' },
        { id: '2', name: 'CK-MB', category: 'Cardiac Markers' },
        { id: '3', name: 'BNP', category: 'Cardiac Markers' },
        { id: '4', name: 'Lipid Panel', category: 'Chemistry' },
        { id: '5', name: 'PT/INR', category: 'Coagulation' }
      ]
    };
  }

  // Labor & Delivery Template
  getLaborDeliveryTemplate() {
    return {
      medicines: [
        { id: '00409617', name: 'Oxytocin', drawer: 'A1', dosage: '10 units/mL injection' },
        { id: '00074017', name: 'Magnesium Sulfate', drawer: 'A1', dosage: '50% injection (5g/10mL)' },
        { id: '00409285', name: 'Methylergonovine', drawer: 'A2', dosage: '0.2mg/mL injection; 0.2mg tablets' },
        { id: '00143962', name: 'Nifedipine', drawer: 'A2', dosage: '10mg capsules; 30mg, 60mg, 90mg ER tablets' },
        { id: '00409142', name: 'Betamethasone', drawer: 'A3', dosage: '6mg/mL injection' },
        { id: '25021800', name: 'Terbutaline', drawer: 'A3', dosage: '0.25mg/mL injection; 2.5mg, 5mg tablets' },
        { id: '00409368', name: 'Naloxone', drawer: 'B1', dosage: '0.4mg/mL, 1mg/mL injection' },
        { id: '00074678', name: 'Fentanyl', drawer: 'B1', dosage: '50mcg/mL injection' },
        { id: '00409128', name: 'Lidocaine', drawer: 'B2', dosage: '1%, 2% injection' },
        { id: '00409505', name: 'Epinephrine', drawer: 'B3', dosage: '1mg/mL (1:1000) injection' }
      ],
      patients: [
        {
          id: '445566778899',
          name: 'Maria Rodriguez',
          dob: '1995-04-12',
          mrn: 'OB-3456',
          gender: 'Female',
          chartData: {
            chiefComplaint: 'Active labor, G2P1',
            allergies: 'NKDA',
            medicalHistory: 'Previous uncomplicated vaginal delivery',
            currentMedications: 'Prenatal vitamins',
            obstetricHistory: 'EDD: Today, 39+2 weeks gestation'
          }
        }
      ],
      labTestTypes: [
        { id: '1', name: 'CBC', category: 'Hematology' },
        { id: '2', name: 'Type and Screen', category: 'Blood Bank' },
        { id: '3', name: 'GBS Status', category: 'Microbiology' },
        { id: '4', name: 'Urinalysis', category: 'Urinalysis' },
        { id: '5', name: 'RPR/VDRL', category: 'Serology' }
      ]
    };
  }

  // Emergency Medicine Template
  getEmergencyTemplate() {
    return {
      medicines: [
        { id: '00409505', name: 'Epinephrine', drawer: 'A1', dosage: '1mg/mL (1:1000), 0.1mg/mL (1:10000) injection' },
        { id: '00409368', name: 'Naloxone', drawer: 'A1', dosage: '0.4mg/mL, 1mg/mL injection; 4mg nasal spray' },
        { id: '00074350', name: 'Atropine', drawer: 'A2', dosage: '0.1mg/mL, 0.4mg/mL, 1mg/mL injection' },
        { id: '00409285', name: 'Adenosine', drawer: 'A2', dosage: '3mg/mL injection' },
        { id: '00409142', name: 'Dexamethasone', drawer: 'A3', dosage: '4mg/mL injection' },
        { id: '00904562', name: 'Ondansetron', drawer: 'B1', dosage: '2mg/mL injection; 4mg, 8mg tablets' },
        { id: '00074678', name: 'Morphine', drawer: 'B1', dosage: '2mg/mL, 4mg/mL, 10mg/mL injection' },
        { id: '00409128', name: 'Lidocaine', drawer: 'B2', dosage: '1%, 2% injection; 2mg/mL cardiac injection' },
        { id: '00143921', name: 'Lorazepam', drawer: 'B3', dosage: '2mg/mL, 4mg/mL injection' },
        { id: '68084033', name: 'Activated Charcoal', drawer: 'C1', dosage: '25g, 50g suspension' }
      ],
      patients: [
        {
          id: '556677889900',
          name: 'David Chen',
          dob: '1978-09-25',
          mrn: 'ER-7890',
          gender: 'Male',
          chartData: {
            chiefComplaint: 'Chest pain, arrived via EMS',
            allergies: 'Sulfa drugs',
            medicalHistory: 'Hypertension, smoking',
            currentMedications: 'Unknown',
            triageInfo: 'Level 2 - Emergent, VS: BP 180/100, HR 95, RR 18, O2 98%'
          }
        }
      ],
      labTestTypes: [
        { id: '1', name: 'Troponin I (STAT)', category: 'Cardiac Markers' },
        { id: '2', name: 'CBC (STAT)', category: 'Hematology' },
        { id: '3', name: 'BMP (STAT)', category: 'Chemistry' },
        { id: '4', name: 'PT/PTT (STAT)', category: 'Coagulation' },
        { id: '5', name: 'Toxicology Screen', category: 'Toxicology' }
      ]
    };
  }

  // Surgery Template
  getSurgeryTemplate() {
    return {
      medicines: [
        { id: '00074678', name: 'Morphine', drawer: 'A1', dosage: '2mg/mL, 4mg/mL, 10mg/mL injection' },
        { id: '00074017', name: 'Fentanyl', drawer: 'A1', dosage: '50mcg/mL injection' },
        { id: '00409128', name: 'Lidocaine', drawer: 'A2', dosage: '1%, 2% injection' },
        { id: '00143921', name: 'Propofol', drawer: 'A2', dosage: '10mg/mL injection' },
        { id: '00409142', name: 'Dexamethasone', drawer: 'A3', dosage: '4mg/mL injection' },
        { id: '00904562', name: 'Ondansetron', drawer: 'B1', dosage: '2mg/mL injection' },
        { id: '00173070', name: 'Cefazolin', drawer: 'B2', dosage: '1g, 2g injection' },
        { id: '00409368', name: 'Naloxone', drawer: 'B3', dosage: '0.4mg/mL injection' },
        { id: '25021155', name: 'Ketorolac', drawer: 'C1', dosage: '15mg/mL, 30mg/mL injection' },
        { id: '68084716', name: 'Furosemide', drawer: 'C2', dosage: '10mg/mL injection' }
      ],
      patients: [
        {
          id: '667788990011',
          name: 'Jennifer Adams',
          dob: '1970-12-03',
          mrn: 'SURG-4567',
          gender: 'Female',
          chartData: {
            chiefComplaint: 'Scheduled laparoscopic cholecystectomy',
            allergies: 'Penicillin (rash)',
            medicalHistory: 'Cholelithiasis, hypertension',
            currentMedications: 'Lisinopril 10mg daily (held this morning)',
            surgicalPlan: 'Laparoscopic cholecystectomy, possible conversion to open'
          }
        }
      ],
      labTestTypes: [
        { id: '1', name: 'CBC with Differential', category: 'Hematology' },
        { id: '2', name: 'BMP', category: 'Chemistry' },
        { id: '3', name: 'PT/PTT', category: 'Coagulation' },
        { id: '4', name: 'Type and Screen', category: 'Blood Bank' },
        { id: '5', name: 'Liver Function Tests', category: 'Chemistry' }
      ]
    };
  }

  // ICU Template
  getICUTemplate() {
    return {
      medicines: [
        { id: '00409617', name: 'Norepinephrine', drawer: 'A1', dosage: '1mg/mL injection' },
        { id: '00074350', name: 'Vasopressin', drawer: 'A1', dosage: '20 units/mL injection' },
        { id: '00143962', name: 'Propofol', drawer: 'A2', dosage: '10mg/mL injection' },
        { id: '00143921', name: 'Midazolam', drawer: 'A2', dosage: '1mg/mL, 5mg/mL injection' },
        { id: '00074678', name: 'Fentanyl', drawer: 'A3', dosage: '50mcg/mL injection' },
        { id: '00409142', name: 'Dexmedetomidine', drawer: 'A3', dosage: '100mcg/mL injection' },
        { id: '00409505', name: 'Epinephrine', drawer: 'B1', dosage: '1mg/mL injection' },
        { id: '00074017', name: 'Insulin (Regular)', drawer: 'B2', dosage: '100 units/mL injection' },
        { id: '68084716', name: 'Furosemide', drawer: 'B3', dosage: '10mg/mL injection' },
        { id: '00409368', name: 'Heparin', drawer: 'C1', dosage: '1000 units/mL, 5000 units/mL injection' }
      ],
      patients: [
        {
          id: '778899001122',
          name: 'Michael Johnson',
          dob: '1955-06-18',
          mrn: 'ICU-8901',
          gender: 'Male',
          chartData: {
            chiefComplaint: 'Respiratory failure, intubated',
            allergies: 'NKDA',
            medicalHistory: 'COPD, CHF, DM Type 2',
            currentMedications: 'Multiple drips - see ICU flowsheet',
            currentStatus: 'Intubated, on vasopressors, CRRT'
          }
        }
      ],
      labTestTypes: [
        { id: '1', name: 'ABG', category: 'Blood Gas' },
        { id: '2', name: 'Lactate', category: 'Chemistry' },
        { id: '3', name: 'Procalcitonin', category: 'Inflammatory Markers' },
        { id: '4', name: 'Troponin I', category: 'Cardiac Markers' },
        { id: '5', name: 'PT/PTT/INR', category: 'Coagulation' }
      ]
    };
  }

  // Oncology Template
  getOncologyTemplate() {
    return {
      medicines: [
        { id: '00904562', name: 'Ondansetron', drawer: 'A1', dosage: '2mg/mL injection; 4mg, 8mg tablets' },
        { id: '00143962', name: 'Granisetron', drawer: 'A1', dosage: '0.1mg/mL injection; 1mg tablets' },
        { id: '00409142', name: 'Dexamethasone', drawer: 'A2', dosage: '4mg/mL injection; 0.5mg, 0.75mg, 1mg, 4mg tablets' },
        { id: '25021800', name: 'Prochlorperazine', drawer: 'A2', dosage: '5mg/mL injection; 5mg, 10mg tablets' },
        { id: '00074678', name: 'Morphine', drawer: 'B1', dosage: '2mg/mL injection; 15mg, 30mg ER tablets' },
        { id: '00074017', name: 'Oxycodone', drawer: 'B1', dosage: '5mg, 10mg, 15mg, 20mg, 30mg tablets' },
        { id: '68084033', name: 'Allopurinol', drawer: 'B2', dosage: '100mg, 300mg tablets' },
        { id: '00173070', name: 'Filgrastim', drawer: 'B3', dosage: '300mcg/mL injection' },
        { id: '68382004', name: 'Leucovorin', drawer: 'C1', dosage: '10mg/mL injection; 5mg, 15mg, 25mg tablets' },
        { id: '43547040', name: 'Lorazepam', drawer: 'C2', dosage: '2mg/mL injection; 0.5mg, 1mg, 2mg tablets' }
      ],
      patients: [
        {
          id: '889900112233',
          name: 'Linda Wilson',
          dob: '1968-02-28',
          mrn: 'ONC-2345',
          gender: 'Female',
          chartData: {
            chiefComplaint: 'Cycle 3 chemotherapy treatment',
            allergies: 'NKDA',
            medicalHistory: 'Breast cancer Stage IIIA, s/p lumpectomy',
            currentMedications: 'Ondansetron PRN, dexamethasone with chemo',
            treatmentPlan: 'AC-T protocol, currently receiving Adriamycin/Cytoxan'
          }
        }
      ],
      labTestTypes: [
        { id: '1', name: 'CBC with Differential', category: 'Hematology' },
        { id: '2', name: 'CMP', category: 'Chemistry' },
        { id: '3', name: 'Liver Function Tests', category: 'Chemistry' },
        { id: '4', name: 'Tumor Markers', category: 'Oncology' },
        { id: '5', name: 'Magnesium/Phosphorus', category: 'Chemistry' }
      ]
    };
  }

  // Apply template to database
  async applyTemplate(templateId, storage) {
    const template = this.getTemplateConfig(templateId);
    
    try {
      // Clear existing data
      await this.clearDatabase(storage);
      
      // Insert template data
      await this.insertTemplateData(template, storage);
      
      return { success: true, templateId };
    } catch (error) {
      console.error('Error applying template:', error);
      return { success: false, error: error.message };
    }
  }

  async clearDatabase(storage) {
    // Clear all existing data
    await storage.deleteAllMedicines();
    await storage.deleteAllPatients();
    await storage.deleteAllLabTestTypes();
    await storage.deleteAllPrescriptions();
    await storage.deleteAllAdministrations();
    await storage.deleteAllLabResults();
  }

  async insertTemplateData(template, storage) {
    // Insert medicines
    for (const medicine of template.medicines) {
      await storage.createMedicine(medicine);
    }

    // Insert patients
    for (const patient of template.patients) {
      await storage.createPatient(patient);
    }

    // Insert lab test types
    for (const labTest of template.labTestTypes) {
      await storage.createLabTestType(labTest);
    }
  }

  // Save custom template configuration
  saveCustomTemplate(templateData) {
    const customTemplatesFile = path.join(this.templatesDir, 'custom-templates.json');
    
    let customTemplates = [];
    if (fs.existsSync(customTemplatesFile)) {
      try {
        customTemplates = JSON.parse(fs.readFileSync(customTemplatesFile, 'utf8'));
      } catch (error) {
        console.error('Error reading custom templates:', error);
        customTemplates = [];
      }
    }

    templateData.id = `custom-${Date.now()}`;
    templateData.category = 'Custom';
    templateData.isCustom = true;
    
    customTemplates.push(templateData);
    
    try {
      fs.writeFileSync(customTemplatesFile, JSON.stringify(customTemplates, null, 2));
      return { success: true, templateId: templateData.id };
    } catch (error) {
      console.error('Error saving custom template:', error);
      return { success: false, error: error.message };
    }
  }
}

export default DatabaseTemplateManager;