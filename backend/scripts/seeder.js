const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Bed = require('../models/Bed');
const dotenv = require('dotenv');

dotenv.config();

const STAFF_CREDENTIALS = {
  admin: 'admin123',
  doctor: 'doctor123',
  staff: 'staff123',
  peon: 'peon123',
  chemist: 'chemist123',
  user: 'patient123'
};

const runSeeder = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medibot_hospital';
    await mongoose.connect(connStr);
    console.log('[Seeder] Connected to MongoDB');

    // 1. Clear database
    console.log('[Seeder] Cleaning collections...');
    await User.deleteMany({});
    await Bed.deleteMany({});
    console.log('[Seeder] Clean complete.');

    // 2. Hash passwords
    console.log('[Seeder] Hashing passwords...');
    const hashed = {};
    for (const [role, pw] of Object.entries(STAFF_CREDENTIALS)) {
      hashed[role] = await bcrypt.hash(pw, 10);
    }

    const users = [];

    // 3. Create Admin
    users.push({
      full_name: 'Supreme Admin',
      email: 'admin@medibot.com',
      passwordHash: hashed.admin,
      role: 'admin'
    });

    const depts = ['Emergency', 'Cardiology', 'Pediatrics', 'General Ward', 'ICU'];

    // 4. Create 10 Doctors (5 Day, 5 Night)
    for (let i = 1; i <= 10; i++) {
      const isDay = i <= 5;
      users.push({
        full_name: `Dr. Doctor ${i}`,
        email: `doctor${i}@medibot.com`,
        passwordHash: hashed.doctor,
        role: 'doctor',
        duty_shift: isDay ? 'day' : 'night',
        employee_id: `EMP-DOC-${String(i).padStart(3, '0')}`,
        contact_info: `+91 98765430${String(i).padStart(2, '0')}`,
        qualification: i % 2 === 0 ? 'MD Pediatrics' : 'MS Cardiology',
        assigned_department: depts[i % depts.length],
        duty_log: [
          { action: 'Shift activated - Roster schedule initialized' },
          { action: 'Completed morning patient rounds checklist' }
        ]
      });
    }

    // 5. Create 50 Staff/Nurses (25 Day, 25 Night)
    for (let i = 1; i <= 50; i++) {
      const isDay = i <= 25;
      users.push({
        full_name: `Nurse Staff ${i}`,
        email: `staff${i}@medibot.com`,
        passwordHash: hashed.staff,
        role: 'staff',
        duty_shift: isDay ? 'day' : 'night',
        employee_id: `EMP-STF-${String(i).padStart(3, '0')}`,
        contact_info: `+91 99887766${String(i).padStart(2, '0')}`,
        qualification: 'B.Sc. Nursing',
        assigned_department: depts[i % depts.length],
        duty_log: [
          { action: 'Logged in to ward inventory management system' }
        ]
      });
    }

    // 6. Create 5 Peons
    for (let i = 1; i <= 5; i++) {
      users.push({
        full_name: `Peon Messenger ${i}`,
        email: `peon${i}@medibot.com`,
        passwordHash: hashed.peon,
        role: 'peon',
        employee_id: `EMP-PEON-${String(i).padStart(3, '0')}`,
        contact_info: `+91 97766554${String(i).padStart(2, '0')}`,
        qualification: 'High School Graduate',
        assigned_department: 'Hospital Orderly Logistics',
        duty_log: [{ action: 'Reported to floor coordinator' }]
      });
    }

    // 7. Create Chemist
    users.push({
      full_name: 'Chemist Pharmacist',
      email: 'chemist@medibot.com',
      passwordHash: hashed.chemist,
      role: 'chemist',
      employee_id: 'EMP-CHM-001',
      contact_info: '+91 9665544332',
      qualification: 'B.Pharma',
      assigned_department: 'Inpatient Pharmacy Store',
      duty_log: [{ action: 'Opened pharmacy inventory database' }]
    });

    // 8. Create Default Patient (Floor 1, Bed 1)
    users.push({
      full_name: 'Patient User',
      email: 'patient@medibot.com',
      passwordHash: hashed.user,
      role: 'user',
      patient_details: {
        allocated_floor: 1,
        allocated_bed: 1,
        age: 34,
        gender: 'Male',
        contact: '+91 9008007001',
        clinical_history: [
          { event: 'Admission', note: 'Admitted with high fever and respiratory fatigue', logged_by: 'Supreme Admin' },
          { event: 'Symptom log', note: 'Slight congestion observed in upper lobes', logged_by: 'Nurse Staff 1' }
        ],
        medication_log: [
          { name: 'Paracetamol 650mg', quantity: 2, dispensed_by: 'Chemist Pharmacist' }
        ]
      }
    });

    console.log('[Seeder] Inserting users...');
    const insertedUsers = await User.insertMany(users);
    console.log(`[Seeder] Seeded ${insertedUsers.length} users successfully.`);

    // Match the patient user to Bed 1 on Floor 1
    const patientObj = insertedUsers.find(u => u.role === 'user' && u.email === 'patient@medibot.com');

    // 9. Create 50 Beds (5 floors x 10 beds)
    console.log('[Seeder] Inserting 50 beds...');
    const beds = [];
    for (let floor = 1; floor <= 5; floor++) {
      for (let bedNum = 1; bedNum <= 10; bedNum++) {
        const isTarget = floor === 1 && bedNum === 1;
        beds.push({
          floor: floor,
          bed_number: bedNum,
          is_occupied: isTarget,
          current_patient_id: isTarget ? patientObj._id : null
        });
      }
    }
    await Bed.insertMany(beds);
    console.log('[Seeder] Seeded 50 beds successfully.');

    console.log('[Seeder] Seeding finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error(`[Seeder Error] ${err.message}`);
    process.exit(1);
  }
};

runSeeder();
