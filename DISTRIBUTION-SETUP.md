# MedChart Pro - Distribution Setup Guide

## For the Person Receiving This App

Hi! You've received the MedChart Pro medical training application. Here's how to get it running:

### Quick Setup (5 minutes)

1. **Download Node.js** (if you don't have it):
   - Go to [nodejs.org](https://nodejs.org)
   - Download the LTS version (recommended)
   - Install it (just click through the installer)

2. **Extract the ZIP file** to a folder (like Desktop/MedChart-Pro)

3. **Open Terminal/Command Prompt**:
   - **Windows**: Press `Win + R`, type `cmd`, press Enter
   - **Mac**: Press `Cmd + Space`, type "Terminal", press Enter
   - **Navigate to the app folder**: `cd Desktop/MedChart-Pro` (adjust path as needed)

4. **Run these two commands**:
   ```bash
   npm install
   npm run dev
   ```

5. **Open your browser** and go to: `http://localhost:5000`

### What You'll Get

✅ Complete medical training system  
✅ Patient management with barcode scanning  
✅ Medication tracking and administration  
✅ Lab results and vital signs monitoring  
✅ Admin dashboard for data management  
✅ Pain assessment tools  
✅ Time simulation for training scenarios  

### Login Details

- **Username**: admin  
- **PIN**: 0000  

### Need Help?

If you have any issues:
1. Make sure Node.js is installed (`node --version` should show a version)
2. Make sure you're in the correct folder
3. Try running `npm run dev` again
4. The app runs on `http://localhost:5000`

### Features to Test

1. **Patient Scanner** - Scan or enter patient IDs
2. **Medication Administration** - Practice safe medication protocols
3. **Admin Dashboard** - Manage patients, prescriptions, and data
4. **Barcode Integration** - Test with patient and medication barcodes
5. **Time Simulation** - Speed up time for training scenarios

Enjoy testing the MedChart Pro system!