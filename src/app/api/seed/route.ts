import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateReferenceNo, getPPKPRole, getPPLRole } from '@/lib/constants';
import { hashPassword } from '@/lib/auth';
import { requireAuth, canSeed } from '@/lib/rbac';

// Seed database with sample users and applications
// Only works if database is empty. Requires ADMIN role.
export async function POST(request: Request) {
  try {
    // ── Auth check: Only ADMIN can seed ──
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    if (!canSeed(authResult.user.role)) {
      return NextResponse.json({ error: 'Hanya Pentadbir boleh memuatkan data contoh.' }, { status: 403 });
    }

    // ── Check if data already exists ──
    const existingUserCount = await db.user.count();
    if (existingUserCount > 0) {
      // Check for force query param to allow overwrite
      const url = new URL(request.url);
      const force = url.searchParams.get('force') === 'true';
      if (!force) {
        return NextResponse.json({ 
          error: 'Database sudah mengandungi data. Gunakan ?force=true untuk memadam dan menggantikan data sedia ada.',
          existingUsers: existingUserCount,
        }, { status: 409 });
      }
      // Force mode: clear existing data
      await db.workflowStep.deleteMany();
      await db.application.deleteMany();
      await db.kpiConfig.deleteMany();
      await db.businessType.deleteMany();
      await db.applicationType.deleteMany();
      await db.user.deleteMany();
    }

    // Create users with credentials (password same as username for demo)
    const usersData = [
      { username: 'admin', password: 'admin123', name: 'Pentadbir Sistem', role: 'ADMIN', zone: null, email: 'admin@mpsp.gov.my', phone: '04-5550000' },
      { username: 'siti', password: 'siti123', name: 'Siti Aminah', role: 'KAUNTER', zone: null, email: 'siti@mpsp.gov.my', phone: '04-5551001' },
      { username: 'ahmad', password: 'ahmad123', name: 'Ahmad Razali', role: 'KAUNTER', zone: null, email: 'ahmad@mpsp.gov.my', phone: '04-5551002' },
      { username: 'lim', password: 'lim123', name: 'Lim Wei Hong', role: 'PT', zone: 'A', email: 'lim.wh@mpsp.gov.my', phone: '04-5552001' },
      { username: 'nasir', password: 'nasir123', name: 'Nasir Hassan', role: 'PT', zone: 'B', email: 'nasir@mpsp.gov.my', phone: '04-5552002' },
      { username: 'rajesh', password: 'rajesh123', name: 'Rajesh Kumar', role: 'PT', zone: 'C', email: 'rajesh@mpsp.gov.my', phone: '04-5552003' },
      { username: 'tanml', password: 'tanml123', name: 'Tan Mei Ling', role: 'PT', zone: 'D', email: 'tan.ml@mpsp.gov.my', phone: '04-5552004' },
      { username: 'omar', password: 'omar123', name: 'Omar Bakar', role: 'PT', zone: 'E', email: 'omar@mpsp.gov.my', phone: '04-5552005' },
      { username: 'cheah', password: 'cheah123', name: 'Cheah Soo Beng', role: 'PPKP_L', zone: null, email: 'cheah@mpsp.gov.my', phone: '04-5553001' },
      { username: 'wong', password: 'wong123', name: 'Wong Hock Seng', role: 'PPKP_L', zone: null, email: 'wong@mpsp.gov.my', phone: '04-5553002' },
      { username: 'noraini', password: 'noraini123', name: 'Noraini Mohd', role: 'PPKP_P', zone: null, email: 'noraini@mpsp.gov.my', phone: '04-5554001' },
      { username: 'zabidi', password: 'zabidi123', name: 'Zabidi Ali', role: 'PPKP_P', zone: null, email: 'zabidi@mpsp.gov.my', phone: '04-5554002' },
      { username: 'tee', password: 'tee123', name: 'Tee Kim Seng', role: 'PPL_L', zone: null, email: 'tee@mpsp.gov.my', phone: '04-5555001' },
      { username: 'rosnah', password: 'rosnah123', name: 'Rosnah Ahmad', role: 'PPL_P', zone: null, email: 'rosnah@mpsp.gov.my', phone: '04-5555002' },
      { username: 'ismail', password: 'ismail123', name: "Dato' Ismail", role: 'PLB', zone: null, email: 'ismail@mpsp.gov.my', phone: '04-5556001' },
      { username: 'farid', password: 'farid123', name: 'Encik Farid', role: 'PLB', zone: null, email: 'farid@mpsp.gov.my', phone: '04-5556002' },
    ];

    const users = [];
    for (const u of usersData) {
      const created = await db.user.create({
        data: {
          username: u.username,
          password: hashPassword(u.password),
          name: u.name,
          role: u.role,
          zone: u.zone,
          email: u.email,
          phone: u.phone,
        },
      });
      users.push(created);
    }

    // Create KPI configs
    const kpiConfigs = [
      { stepName: 'PT_FILE_OPENING', slaDays: 3, warningDays: 1 },
      { stepName: 'PPKP_PROCESSING', slaDays: 4, warningDays: 1 },
      { stepName: 'PPL_REVIEW', slaDays: 3, warningDays: 1 },
    ];

    for (const kpi of kpiConfigs) {
      await db.kpiConfig.create({ data: kpi });
    }

    // Create business types
    const businessTypes = [
      { name: 'Restoran / Kedai Makan', sortOrder: 1 },
      { name: 'Kedai Runcit / Minimart', sortOrder: 2 },
      { name: 'Pasar Malam / Gerak Kerja', sortOrder: 3 },
      { name: 'Bidan / Klinik', sortOrder: 4 },
      { name: 'Salun Kecantikan / Pendandan Rambut', sortOrder: 5 },
      { name: 'Dobi / Cucian', sortOrder: 6 },
      { name: 'Stesen Minyak', sortOrder: 7 },
      { name: 'Bengkel Kenderaan', sortOrder: 8 },
      { name: 'Perkilangan / Kilang', sortOrder: 9 },
      { name: 'Pengangkutan / Logistik', sortOrder: 10 },
      { name: 'Pendidikan / Tuisyen', sortOrder: 11 },
      { name: 'Perkhidmatan Profesional', sortOrder: 12 },
      { name: 'Pertanian / Akuakultur', sortOrder: 13 },
      { name: 'Lain-lain', sortOrder: 14 },
    ];

    for (const bt of businessTypes) {
      await db.businessType.create({ data: bt });
    }

    // Create application types
    const applicationTypes = [
      { code: 'PERMOHONAN_BARU', label: 'Permohonan Baru', ppkpRoute: 'PPKP_L', sortOrder: 1 },
      { code: 'TUKAR_NAMA_SYARIKAT', label: 'Tukar Nama Syarikat', ppkpRoute: 'PPKP_L', sortOrder: 2 },
      { code: 'TAMBAH_KURANG_PREMIS', label: 'Tambah/Kurang Premis', ppkpRoute: 'PPKP_L', sortOrder: 3 },
      { code: 'TAMBAH_TUKAR_AKTIVITI', label: 'Tambah/Tukar Aktiviti', ppkpRoute: 'PPKP_P', sortOrder: 4 },
      { code: 'PINDAH_MILIK_LESEN', label: 'Pindah Milik Lesen', ppkpRoute: 'PPKP_L', sortOrder: 5 },
    ];

    for (const at of applicationTypes) {
      await db.applicationType.create({ data: at });
    }

    // Create sample applications with various statuses
    const now = new Date();
    const applications = [
      // Application 1: Recently submitted, pending PT
      {
        applicantName: 'Syarikat Maju Jaya Sdn Bhd',
        applicantIc: '202001012345',
        applicantPhone: '012-3456789',
        applicantAddress: 'No 12, Jalan Perindustrian, Zon A',
        applicationType: 'G8',
        zone: 'A',
        status: 'PENDING_PT',
        currentStep: 'PT_FILE_OPENING',
      },
      // Application 2: PT processing (file opening)
      {
        applicantName: 'Restoran Sedap Belaka',
        applicantIc: '201502006789',
        applicantPhone: '016-7890123',
        applicantAddress: 'No 45, Jalan Merdeka, Zon B',
        applicationType: 'G7',
        zone: 'B',
        status: 'PT_PROCESSING',
        currentStep: 'PT_FILE_OPENING',
      },
      // Application 3: PPKP processing
      {
        applicantName: 'Hotel Emas Perak',
        applicantIc: '201803001234',
        applicantPhone: '013-4567890',
        applicantAddress: 'No 88, Jalan Pantai, Zon C',
        applicationType: 'G11',
        zone: 'C',
        status: 'PPKP_PROCESSING',
        currentStep: 'PPKP_PROCESSING',
        fileNumber: 'MPSP/L/2024/001',
      },
      // Application 4: PPL review
      {
        applicantName: 'Pasar Besar Mutiara',
        applicantIc: '199001001111',
        applicantPhone: '019-2223333',
        applicantAddress: 'Lot 5, Jalan Pasar, Zon D',
        applicationType: 'G2',
        zone: 'D',
        status: 'PPL_REVIEW',
        currentStep: 'PPL_REVIEW',
        fileNumber: 'MPSP/P/2024/002',
      },
      // Application 5: PLB decision
      {
        applicantName: 'Kedai Kopi Senang',
        applicantIc: '201704005555',
        applicantPhone: '011-1234567',
        applicantAddress: 'No 22, Jalan Batu Ferringhi, Zon A',
        applicationType: 'G9',
        zone: 'A',
        status: 'PLB_DECISION',
        currentStep: 'PLB_DECISION',
        fileNumber: 'MPSP/L/2024/003',
      },
      // Application 6: Completed
      {
        applicantName: 'Penjaja Makanan Sejahtera',
        applicantIc: '199505007777',
        applicantPhone: '018-9876543',
        applicantAddress: 'Tapak Penjaja Zon E',
        applicationType: 'G3',
        zone: 'E',
        status: 'COMPLETED',
        currentStep: 'PLB_DECISION',
        fileNumber: 'MPSP/P/2024/004',
        plbDecision: 'SIMPAN_FAIL',
        plbDecisionNotes: 'Permohonan diluluskan. Fail disimpan.',
      },
      // Application 7: Another completed - sent to Jabatan Kesihatan
      {
        applicantName: 'Syarikat Hiburan Mega',
        applicantIc: '202002009999',
        applicantPhone: '014-5556666',
        applicantAddress: 'No 100, Jalan Perai, Zon B',
        applicationType: 'G1_P',
        zone: 'B',
        status: 'COMPLETED',
        currentStep: 'PLB_DECISION',
        fileNumber: 'MPSP/L/2024/005',
        plbDecision: 'JABATAN_KESIHATAN',
        plbDecisionNotes: 'Perlu pengesahan Jabatan Kesihatan.',
      },
      // Application 8: Overdue PT processing
      {
        applicantName: 'Kafe Tepi Laut',
        applicantIc: '201906004444',
        applicantPhone: '015-7778888',
        applicantAddress: 'No 56, Jalan Tanjung, Zon C',
        applicationType: 'G7',
        zone: 'C',
        status: 'PT_PROCESSING',
        currentStep: 'PT_FILE_OPENING',
      },
      // Application 9: Completed - sent to Perancang Bandar
      {
        applicantName: 'Pembangunan Impian Sdn Bhd',
        applicantIc: '202103002222',
        applicantPhone: '017-1112222',
        applicantAddress: 'Lot 10, Persiaran Bandar, Zon D',
        applicationType: 'G1',
        zone: 'D',
        status: 'COMPLETED',
        currentStep: 'PLB_DECISION',
        fileNumber: 'MPSP/L/2024/006',
        plbDecision: 'JABATAN_PERANCANG_BANDAR',
        plbDecisionNotes: 'Perlu kelulusan Jabatan Perancang Bandar.',
      },
      // Application 10: Papan Iklan - PPKP processing
      {
        applicantName: 'Syarikat Media Cerah',
        applicantIc: '201507008888',
        applicantPhone: '012-3334444',
        applicantAddress: 'No 77, Jalan Utama, Zon A',
        applicationType: 'PAPAN_IKLAN',
        zone: 'A',
        status: 'PPKP_PROCESSING',
        currentStep: 'PPKP_PROCESSING',
        fileNumber: 'MPSP/L/2024/007',
      },
      // Application 11: Permit Sementara - PPL review
      {
        applicantName: 'Pameran Usahawan Muda',
        applicantIc: '202208003333',
        applicantPhone: '016-5557777',
        applicantAddress: 'Dewan Utama, Zon E',
        applicationType: 'PERMIT_SEMENTARA',
        zone: 'E',
        status: 'PPL_REVIEW',
        currentStep: 'PPL_REVIEW',
        fileNumber: 'MPSP/P/2024/008',
      },
      // Application 12: Pending PT (new)
      {
        applicantName: 'Gerai Makanan Cepat Saji',
        applicantIc: '199803006666',
        applicantPhone: '019-8889999',
        applicantAddress: 'No 33, Jalan Bukit Mertajam, Zon B',
        applicationType: 'G8',
        zone: 'B',
        status: 'PENDING_PT',
        currentStep: 'PT_FILE_OPENING',
      },
      // Application 13: Rejected by PLB (Ditolak)
      {
        applicantName: 'Syarikat Gembira Sentosa',
        applicantIc: '202005001111',
        applicantPhone: '011-2223333',
        applicantAddress: 'No 90, Jalan Seberang Perai, Zon A',
        applicationType: 'G1',
        zone: 'A',
        status: 'REJECTED',
        currentStep: 'PLB_DECISION',
        fileNumber: 'MPSP/L/2024/009',
        plbDecision: 'DITOLAK',
        plbDecisionNotes: 'Permohonan ditolak. Fail tidak lengkap dan tidak memenuhi syarat.',
      },
    ];

    for (let i = 0; i < applications.length; i++) {
      const app = applications[i];
      const refNo = generateReferenceNo();
      const createdAt = new Date(now.getTime() - (i + 1) * 2 * 24 * 60 * 60 * 1000); // stagger creation dates

      // Find appropriate staff using User model
      const ptStaff = users.find(s => s.role === 'PT' && s.zone === app.zone);
      const ppkpRole = getPPKPRole(app.applicationType);
      const ppkpStaff = users.find(s => s.role === ppkpRole);
      const pplRole = getPPLRole(ppkpRole);
      const pplStaff = users.find(s => s.role === pplRole);
      const plbStaff = users.find(s => s.role === 'PLB');

      const application = await db.application.create({
        data: {
          referenceNo: refNo,
          applicantName: app.applicantName,
          applicantIc: app.applicantIc,
          applicantPhone: app.applicantPhone,
          applicantAddress: app.applicantAddress,
          applicationType: app.applicationType,
          zone: app.zone,
          status: app.status,
          currentStep: app.currentStep,
          fileNumber: app.fileNumber || null,
          plbDecision: app.plbDecision || null,
          plbDecisionNotes: app.plbDecisionNotes || null,
          ptStaffId: ptStaff?.id || null,
          ppkpStaffId: ppkpStaff?.id || null,
          pplStaffId: pplStaff?.id || null,
          plbStaffId: plbStaff?.id || null,
          createdAt,
          updatedAt: createdAt,
        },
      });

      // Create workflow steps for each application based on current status
      const stepsToCreate = getStepsForStatus(app.status, createdAt, now, app.zone, users, ptStaff, ppkpStaff, pplStaff, plbStaff);

      for (const step of stepsToCreate) {
        await db.workflowStep.create({
          data: {
            applicationId: application.id,
            step: step.step,
            status: step.status,
            assignedToId: step.assignedToId,
            startedAt: step.startedAt,
            completedAt: step.completedAt,
            slaDays: step.slaDays,
            slaDeadline: step.slaDeadline,
            comments: step.comments,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      userCount: users.length,
      kpiConfigCount: kpiConfigs.length,
      businessTypeCount: businessTypes.length,
      applicationTypeCount: applicationTypes.length,
      applicationCount: applications.length,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}

function getStepsForStatus(
  status: string,
  createdAt: Date,
  now: Date,
  zone: string,
  users: any[],
  ptStaff: any,
  ppkpStaff: any,
  pplStaff: any,
  plbStaff: any
) {
  const steps: any[] = [];
  const kaunterStaff = users.find(s => s.role === 'KAUNTER');

  // Step 1: Kaunter receipt - always completed
  steps.push({
    step: 'KAUNTER_RECEIPT',
    status: 'COMPLETED',
    assignedToId: kaunterStaff?.id || null,
    startedAt: createdAt,
    completedAt: new Date(createdAt.getTime() + 15 * 60 * 1000), // 15 min
    slaDays: 0,
    slaDeadline: createdAt,
    comments: 'Permohonan diterima di kaunter',
  });

  // Step 2: PT File Opening
  if (status === 'PENDING_PT') {
    steps.push({
      step: 'PT_FILE_OPENING',
      status: 'PENDING',
      assignedToId: ptStaff?.id || null,
      startedAt: createdAt,
      completedAt: null,
      slaDays: 3,
      slaDeadline: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000),
      comments: null,
    });
    return steps;
  }

  // Application 8 (overdue) - PT processing but past SLA
  const isOverdue = status === 'PT_PROCESSING' && zone === 'C';

  steps.push({
    step: 'PT_FILE_OPENING',
    status: isOverdue ? 'OVERDUE' : 'COMPLETED',
    assignedToId: ptStaff?.id || null,
    startedAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
    completedAt: isOverdue ? null : new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000),
    slaDays: 3,
    slaDeadline: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    comments: isOverdue ? null : 'Fail berjaya dibuka',
  });

  if (status === 'PT_PROCESSING') {
    steps.push({
      step: 'PT_FILE_REGISTRATION',
      status: 'PENDING',
      assignedToId: ptStaff?.id || null,
      startedAt: null,
      completedAt: null,
      slaDays: 0,
      slaDeadline: null,
      comments: null,
    });
    return steps;
  }

  // Step 3: PT File Registration - completed
  const fileRegTime = new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000);
  steps.push({
    step: 'PT_FILE_REGISTRATION',
    status: 'COMPLETED',
    assignedToId: ptStaff?.id || null,
    startedAt: fileRegTime,
    completedAt: new Date(fileRegTime.getTime() + 30 * 60 * 1000),
    slaDays: 0,
    slaDeadline: null,
    comments: 'Nombor fail didaftarkan',
  });

  // Step 4: PPKP Processing
  const ppkpStartTime = new Date(fileRegTime.getTime() + 30 * 60 * 1000);

  if (status === 'PPKP_PROCESSING') {
    steps.push({
      step: 'PPKP_PROCESSING',
      status: 'IN_PROGRESS',
      assignedToId: ppkpStaff?.id || null,
      startedAt: ppkpStartTime,
      completedAt: null,
      slaDays: 4,
      slaDeadline: new Date(ppkpStartTime.getTime() + 4 * 24 * 60 * 60 * 1000),
      comments: null,
    });
    return steps;
  }

  const ppkpCompleteTime = new Date(ppkpStartTime.getTime() + 2 * 24 * 60 * 60 * 1000);
  steps.push({
    step: 'PPKP_PROCESSING',
    status: 'COMPLETED',
    assignedToId: ppkpStaff?.id || null,
    startedAt: ppkpStartTime,
    completedAt: ppkpCompleteTime,
    slaDays: 4,
    slaDeadline: new Date(ppkpStartTime.getTime() + 4 * 24 * 60 * 60 * 1000),
    comments: 'Pemprosesan PPKP selesai',
  });

  // Step 5: PPL Review
  if (status === 'PPL_REVIEW') {
    steps.push({
      step: 'PPL_REVIEW',
      status: 'IN_PROGRESS',
      assignedToId: pplStaff?.id || null,
      startedAt: ppkpCompleteTime,
      completedAt: null,
      slaDays: 3,
      slaDeadline: new Date(ppkpCompleteTime.getTime() + 3 * 24 * 60 * 60 * 1000),
      comments: null,
    });
    return steps;
  }

  const pplCompleteTime = new Date(ppkpCompleteTime.getTime() + 2 * 24 * 60 * 60 * 1000);
  steps.push({
    step: 'PPL_REVIEW',
    status: 'COMPLETED',
    assignedToId: pplStaff?.id || null,
    startedAt: ppkpCompleteTime,
    completedAt: pplCompleteTime,
    slaDays: 3,
    slaDeadline: new Date(ppkpCompleteTime.getTime() + 3 * 24 * 60 * 60 * 1000),
    comments: 'Ulasan PPL diberikan',
  });

  // Step 6: PLB Decision
  if (status === 'PLB_DECISION') {
    steps.push({
      step: 'PLB_DECISION',
      status: 'IN_PROGRESS',
      assignedToId: plbStaff?.id || null,
      startedAt: pplCompleteTime,
      completedAt: null,
      slaDays: 0,
      slaDeadline: null,
      comments: null,
    });
    return steps;
  }

  if (status === 'COMPLETED' || status === 'REJECTED') {
    steps.push({
      step: 'PLB_DECISION',
      status: 'COMPLETED',
      assignedToId: plbStaff?.id || null,
      startedAt: pplCompleteTime,
      completedAt: new Date(pplCompleteTime.getTime() + 24 * 60 * 60 * 1000),
      slaDays: 0,
      slaDeadline: null,
      comments: status === 'REJECTED' ? 'Permohonan ditolak' : 'Keputusan dibuat',
    });
  }

  return steps;
}
