import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LicenseGenerator {
  constructor() {
    this.secretKey = 'MedChart-Pro-2025-License-System'; // Should match activation-system.js
    this.licenseDatabase = path.join(__dirname, '..', 'generated-licenses.json');
  }

  // Generate a single license key
  generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let keyPart = '';
    
    // Generate 12 random characters
    for (let i = 0; i < 12; i++) {
      keyPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Calculate checksum
    const checksum = crypto
      .createHash('md5')
      .update(keyPart + this.secretKey)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();
    
    const fullKey = keyPart + checksum;
    
    // Format with dashes
    return `${fullKey.substring(0, 4)}-${fullKey.substring(4, 8)}-${fullKey.substring(8, 12)}-${fullKey.substring(12, 16)}`;
  }

  // Generate multiple license keys
  generateBatchLicenseKeys(count = 10) {
    const licenses = [];
    const generatedSet = new Set();
    
    while (licenses.length < count) {
      const license = this.generateLicenseKey();
      if (!generatedSet.has(license)) {
        generatedSet.add(license);
        licenses.push({
          key: license,
          generated: new Date().toISOString(),
          status: 'unused',
          id: crypto.randomUUID()
        });
      }
    }
    
    return licenses;
  }

  // Save generated licenses to database
  saveLicensesToDatabase(licenses) {
    let existingLicenses = [];
    
    try {
      if (fs.existsSync(this.licenseDatabase)) {
        existingLicenses = JSON.parse(fs.readFileSync(this.licenseDatabase, 'utf8'));
      }
    } catch (error) {
      console.error('Error reading license database:', error);
      existingLicenses = [];
    }
    
    const allLicenses = [...existingLicenses, ...licenses];
    
    try {
      fs.writeFileSync(this.licenseDatabase, JSON.stringify(allLicenses, null, 2));
      console.log(`Saved ${licenses.length} licenses to database. Total: ${allLicenses.length}`);
      return true;
    } catch (error) {
      console.error('Error saving license database:', error);
      return false;
    }
  }

  // Get all generated licenses
  getAllLicenses() {
    try {
      if (fs.existsSync(this.licenseDatabase)) {
        return JSON.parse(fs.readFileSync(this.licenseDatabase, 'utf8'));
      }
    } catch (error) {
      console.error('Error reading license database:', error);
    }
    return [];
  }

  // Mark a license as used
  markLicenseAsUsed(licenseKey, customerInfo = {}) {
    const licenses = this.getAllLicenses();
    const license = licenses.find(l => l.key === licenseKey);
    
    if (license) {
      license.status = 'used';
      license.usedDate = new Date().toISOString();
      license.customerInfo = customerInfo;
      
      try {
        fs.writeFileSync(this.licenseDatabase, JSON.stringify(licenses, null, 2));
        return true;
      } catch (error) {
        console.error('Error updating license database:', error);
        return false;
      }
    }
    
    return false;
  }

  // Validate license format (same as in activation-system.js)
  validateLicenseFormat(licenseKey) {
    const licenseRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    
    if (!licenseRegex.test(licenseKey)) {
      return false;
    }

    const cleanKey = licenseKey.replace(/-/g, '');
    const keyPart = cleanKey.substring(0, 12);
    const checksum = cleanKey.substring(12, 16);
    
    const calculatedChecksum = crypto
      .createHash('md5')
      .update(keyPart + this.secretKey)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();
    
    return checksum === calculatedChecksum;
  }

  // Generate a report of license usage
  generateUsageReport() {
    const licenses = this.getAllLicenses();
    const report = {
      total: licenses.length,
      unused: licenses.filter(l => l.status === 'unused').length,
      used: licenses.filter(l => l.status === 'used').length,
      generatedToday: licenses.filter(l => {
        const genDate = new Date(l.generated);
        const today = new Date();
        return genDate.toDateString() === today.toDateString();
      }).length
    };
    
    return report;
  }

  // Export licenses to various formats
  exportLicenses(format = 'json') {
    const licenses = this.getAllLicenses();
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format.toLowerCase()) {
      case 'csv':
        const csvHeader = 'License Key,Generated Date,Status,Used Date,Customer Info\n';
        const csvData = licenses.map(l => 
          `"${l.key}","${l.generated}","${l.status}","${l.usedDate || ''}","${JSON.stringify(l.customerInfo || {})}"`
        ).join('\n');
        
        const csvFilename = `licenses-export-${timestamp}.csv`;
        fs.writeFileSync(csvFilename, csvHeader + csvData);
        return csvFilename;
        
      case 'txt':
        const txtData = licenses.map(l => l.key).join('\n');
        const txtFilename = `licenses-keys-${timestamp}.txt`;
        fs.writeFileSync(txtFilename, txtData);
        return txtFilename;
        
      default:
        const jsonFilename = `licenses-export-${timestamp}.json`;
        fs.writeFileSync(jsonFilename, JSON.stringify(licenses, null, 2));
        return jsonFilename;
    }
  }
}

// CLI interface for generating licenses
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new LicenseGenerator();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('License Key Generator for MedChart Pro');
    console.log('');
    console.log('Usage:');
    console.log('  node license-generator.js generate [count]     - Generate license keys');
    console.log('  node license-generator.js report              - Show usage report');
    console.log('  node license-generator.js export [format]     - Export licenses (json/csv/txt)');
    console.log('  node license-generator.js validate [key]      - Validate a license key');
    console.log('');
    console.log('Examples:');
    console.log('  node license-generator.js generate 50         - Generate 50 license keys');
    console.log('  node license-generator.js export csv          - Export to CSV file');
    process.exit(0);
  }
  
  const command = args[0];
  
  switch (command) {
    case 'generate':
      const count = parseInt(args[1]) || 10;
      console.log(`Generating ${count} license keys...`);
      
      const licenses = generator.generateBatchLicenseKeys(count);
      generator.saveLicensesToDatabase(licenses);
      
      console.log('Generated license keys:');
      licenses.forEach((license, index) => {
        console.log(`${(index + 1).toString().padStart(3, ' ')}: ${license.key}`);
      });
      
      console.log(`\nTotal licenses generated: ${count}`);
      break;
      
    case 'report':
      const report = generator.generateUsageReport();
      console.log('License Usage Report:');
      console.log(`Total licenses: ${report.total}`);
      console.log(`Unused: ${report.unused}`);
      console.log(`Used: ${report.used}`);
      console.log(`Generated today: ${report.generatedToday}`);
      break;
      
    case 'export':
      const format = args[1] || 'json';
      const filename = generator.exportLicenses(format);
      console.log(`Licenses exported to: ${filename}`);
      break;
      
    case 'validate':
      const key = args[1];
      if (!key) {
        console.log('Please provide a license key to validate');
        process.exit(1);
      }
      
      const isValid = generator.validateLicenseFormat(key);
      console.log(`License key: ${key}`);
      console.log(`Valid: ${isValid ? 'YES' : 'NO'}`);
      
      if (isValid) {
        const licenses = generator.getAllLicenses();
        const license = licenses.find(l => l.key === key);
        if (license) {
          console.log(`Status: ${license.status}`);
          console.log(`Generated: ${license.generated}`);
          if (license.usedDate) {
            console.log(`Used: ${license.usedDate}`);
          }
        } else {
          console.log('Status: Not in database (may be valid but not generated by this system)');
        }
      }
      break;
      
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Use "node license-generator.js" for help');
      process.exit(1);
  }
}

export default LicenseGenerator;