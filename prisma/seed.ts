import { PrismaClient, AgencyType, IncidentStatus, IncidentCategory, UnitStatus, UpdateVisibility } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Clearing previous records...");
  await prisma.statusUpdateLog.deleteMany({});
  await prisma.unitDispatch.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.rescueUnit.deleteMany({});

  console.log("🚒 Seeding Multi-Agency Rescue Units...");
  const fireEngine = await prisma.rescueUnit.create({
    data: {
      callsign: "FIRE-ENGINE-41",
      agencyType: AgencyType.FIRE,
      department: "Metropolitan Fire & Rescue Dept",
      latitude: 37.7785,
      longitude: -122.4182,
      availability: UnitStatus.AVAILABLE,
      personnelCount: 4,
      capabilities: ["Structural Fire Suppression", "Hydraulic Extrication", "Thermal Imaging"],
      contactChannel: "VHF-CH-04",
    },
  });

  const medicAlpha = await prisma.rescueUnit.create({
    data: {
      callsign: "MEDIC-AMBULANCE-09",
      agencyType: AgencyType.MEDICAL,
      department: "Emergency Trauma & Paramedic Corps",
      latitude: 37.7712,
      longitude: -122.4231,
      availability: UnitStatus.DISPATCHED,
      personnelCount: 3,
      capabilities: ["Advanced Life Support", "Mass Casualty Triage", "Portable Ventilators"],
      contactChannel: "VHF-CH-07",
    },
  });

  const policeTac = await prisma.rescueUnit.create({
    data: {
      callsign: "POLICE-TAC-3",
      agencyType: AgencyType.POLICE,
      department: "Metropolitan Police Special Operations",
      latitude: 37.7811,
      longitude: -122.4115,
      availability: UnitStatus.ON_SCENE,
      personnelCount: 2,
      capabilities: ["Perimeter Lockdown", "Evacuation Route Clearance", "Drone Reconnaissance"],
      contactChannel: "UHF-CH-12",
    },
  });

  const ngoRelief = await prisma.rescueUnit.create({
    data: {
      callsign: "NGO-RED-CROSS-ALPHA",
      agencyType: AgencyType.NGO,
      department: "Red Cross Disaster Relief Corps",
      latitude: 37.7699,
      longitude: -122.4312,
      availability: UnitStatus.AVAILABLE,
      personnelCount: 6,
      capabilities: ["Emergency Shelter Setup", "Clean Water Distribution", "Family Reunification"],
      contactChannel: "DIGITAL-RELIEF-01",
    },
  });

  console.log("🚨 Seeding Multilingual Incidents & Citizen Feedback Logs...");

  // Incident 1: Reported in Spanish (Flood / Flash Surge)
  const incidentFlood = await prisma.incident.create({
    data: {
      trackingCode: "SVX-FL-9021",
      originalLanguage: "es",
      rawContent: "El río se ha desbordado cerca de la avenida central. El agua está subiendo rápidamente y hay dos familias atrapadas en el techo de una casa de madera.",
      translatedText: "The river has overflowed near Central Avenue. Water is rising rapidly and two families are trapped on the roof of a wooden residence.",
      latitude: 37.7749,
      longitude: -122.4194,
      locationName: "Central Avenue & 8th St, Sector B",
      city: "Metro City",
      severityScore: 9,
      credibilityScore: 0.94,
      duplicateCount: 3,
      status: IncidentStatus.EN_ROUTE,
      category: IncidentCategory.FLOOD,
      aiSummary: "Rapid flash flood entrapment. 2 families on roof. Structural integrity compromised.",
      hazardsIdentified: ["Rapid Water Current", "Submerged Electrical Transformers"],
      estimatedVictims: 7,
      reporterName: "Elena Ramos",
      reporterPhone: "+1-***-***-8491",
    },
  });

  // Assign Multi-Agency Task Force (Fire + Medical + NGO)
  await prisma.unitDispatch.createMany({
    data: [
      {
        incidentId: incidentFlood.id,
        rescueUnitId: fireEngine.id,
        assignedRole: "Primary Water Rescue & Boat Deployment",
      },
      {
        incidentId: incidentFlood.id,
        rescueUnitId: medicAlpha.id,
        assignedRole: "Hypothermia Triage & Emergency Transport",
      },
    ],
  });

  // Populate Citizen Feedback Loop for Incident 1
  await prisma.statusUpdateLog.createMany({
    data: [
      {
        incidentId: incidentFlood.id,
        status: IncidentStatus.RECEIVED,
        message: "Your emergency report has been ingested by Survixa AI and routed directly to Joint Command.",
        internalNotes: "AI detected Spanish audio. Automated translation and high urgency flag assigned.",
        visibility: UpdateVisibility.PUBLIC,
        sourceAgency: null,
      },
      {
        incidentId: incidentFlood.id,
        status: IncidentStatus.VERIFIED,
        message: "Report verified through corroborating hydrological sensors and duplicate citizen reports in Sector B.",
        internalNotes: "Credibility confirmed at 94% with 3 clustered reports.",
        visibility: UpdateVisibility.PUBLIC,
        sourceAgency: AgencyType.DISASTER_MANAGEMENT,
      },
      {
        incidentId: incidentFlood.id,
        rescueUnitId: fireEngine.id,
        status: IncidentStatus.ASSIGNED,
        message: "Units FIRE-ENGINE-41 and MEDIC-AMBULANCE-09 have been dispatched to your location.",
        internalNotes: "Multi-agency response deployed: Fire water rescue + EMS medical staging.",
        visibility: UpdateVisibility.PUBLIC,
        sourceAgency: AgencyType.FIRE,
      },
      {
        incidentId: incidentFlood.id,
        rescueUnitId: medicAlpha.id,
        status: IncidentStatus.EN_ROUTE,
        message: "Responders are en route with rescue boats. Estimated time of arrival: 4 minutes. Please stay calm and remain on high ground.",
        internalNotes: "MEDIC-09 navigating detour around flooded bridge.",
        visibility: UpdateVisibility.PUBLIC,
        sourceAgency: AgencyType.MEDICAL,
      },
    ],
  });

  // Incident 2: Reported in Hindi (Structural Collapse)
  const incidentCollapse = await prisma.incident.create({
    data: {
      trackingCode: "SVX-SC-4482",
      originalLanguage: "hi",
      rawContent: "पुरानी तीन मंजिला इमारत का पिछला हिस्सा गिर गया है। मलबे के नीचे से आवाजें आ रही हैं। तुरंत एम्बुलेंस और राहत दल भेजिए।",
      translatedText: "The rear section of the old three-story building has collapsed. Voices are heard coming from under the debris. Send ambulances and rescue teams immediately.",
      latitude: 37.7833,
      longitude: -122.4167,
      locationName: "Commercial Market Road, Block 4",
      city: "Metro City",
      severityScore: 10,
      credibilityScore: 0.98,
      duplicateCount: 5,
      status: IncidentStatus.ASSIGNED,
      category: IncidentCategory.STRUCTURAL_COLLAPSE,
      aiSummary: "Catastrophic structural failure. Trapped persons confirmed under rubble. Acoustic distress signals detected.",
      hazardsIdentified: ["Secondary Collapse Risk", "Ruptured Gas Pipeline"],
      estimatedVictims: 12,
      reporterName: "Rajesh Kumar",
      reporterPhone: "+1-***-***-2094",
    },
  });

  await prisma.statusUpdateLog.createMany({
    data: [
      {
        incidentId: incidentCollapse.id,
        status: IncidentStatus.RECEIVED,
        message: "Report received in Hindi. High severity triage initiated.",
        visibility: UpdateVisibility.PUBLIC,
      },
      {
        incidentId: incidentCollapse.id,
        rescueUnitId: policeTac.id,
        status: IncidentStatus.ASSIGNED,
        message: "Tactical Police unit on scene securing perimeter. Heavy search and rescue teams alerted.",
        internalNotes: "Gas utility company notified to shut off main valve in Block 4.",
        visibility: UpdateVisibility.PUBLIC,
        sourceAgency: AgencyType.POLICE,
      },
    ],
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
