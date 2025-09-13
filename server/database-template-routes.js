import DatabaseTemplateManager from './database-templates.js';
import { DatabaseStorage } from './storage.ts';

export function registerDatabaseTemplateRoutes(app) {
  const templateManager = new DatabaseTemplateManager();

  // Get available database templates
  app.get('/api/admin/database-templates', (req, res) => {
    try {
      const templates = templateManager.getAvailableTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({ error: 'Failed to get database templates' });
    }
  });

  // Get template configuration
  app.get('/api/admin/database-templates/:templateId', (req, res) => {
    try {
      const { templateId } = req.params;
      const config = templateManager.getTemplateConfig(templateId);
      res.json(config);
    } catch (error) {
      console.error('Error getting template config:', error);
      res.status(500).json({ error: 'Failed to get template configuration' });
    }
  });

  // Check if database setup is required
  app.get('/api/admin/setup-status', async (req, res) => {
    try {
      const storage = new DatabaseStorage();
      
      // Check if there are any medicines or patients in the database
      const medicines = await storage.getAllMedicines();
      const patients = await storage.getAllPatients();
      
      const needsSetup = medicines.length === 0 && patients.length === 0;
      
      res.json({ 
        needsSetup,
        medicineCount: medicines.length,
        patientCount: patients.length 
      });
    } catch (error) {
      console.error('Error checking setup status:', error);
      res.status(500).json({ error: 'Failed to check setup status' });
    }
  });

  // Apply database template
  app.post('/api/admin/setup-database', async (req, res) => {
    try {
      const { templateId } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }

      const storage = new DatabaseStorage();
      const result = await templateManager.applyTemplate(templateId, storage);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: 'Database setup completed successfully',
          templateId: result.templateId
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error || 'Failed to apply database template' 
        });
      }
    } catch (error) {
      console.error('Error setting up database:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to setup database' 
      });
    }
  });

  // Reset database (admin only)
  app.post('/api/admin/reset-database', async (req, res) => {
    try {
      const storage = new DatabaseStorage();
      await templateManager.clearDatabase(storage);
      
      res.json({ 
        success: true, 
        message: 'Database reset successfully' 
      });
    } catch (error) {
      console.error('Error resetting database:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to reset database' 
      });
    }
  });

  // Save custom template
  app.post('/api/admin/custom-templates', (req, res) => {
    try {
      const templateData = req.body;
      const result = templateManager.saveCustomTemplate(templateData);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error saving custom template:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save custom template' 
      });
    }
  });
}