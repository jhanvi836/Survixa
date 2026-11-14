export const SIMULATION_TAG = "SIMULATION_RUN";

export interface SimulatedDisasterReport {
  simId: string;
  rawContent: string;
  latitude: number;
  longitude: number;
  locationName: string;
  city: string;
  district: string;
  reporterName: string;
  reporterPhone: string;
  category: "FIRE" | "FLOOD" | "STRUCTURAL_COLLAPSE" | "HAZMAT" | "OTHER";
  expectedOutcome: string;
}

/**
 * 10 Realistic Multilingual Reports for Live Presentation:
 * - 3 Duplicates of the same Fire at 5th & Market (<= 250m) to prove Haversine deduplication
 * - 2 Fake/Spam reports to prove AI noise filtering & quarantine
 * - 5 Diverse emergencies across languages (Hindi, Spanish, Kannada, English) to prove life-threat urgency ranking
 */
export const SIMULATED_REPORTS: SimulatedDisasterReport[] = [
  // 1. MASTER REPORT: Building Fire (English)
  {
    simId: "SIM-FIRE-MASTER",
    rawContent: "Massive commercial building fire on 5th and Market St. Heavy black smoke billowing from upper floors and flames spreading rapidly. At least 5 people trapped on the 3rd floor calling for help!",
    latitude: 37.7749,
    longitude: -122.4194,
    locationName: "5th & Market St, Financial District",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "Officer Mark Davis",
    reporterPhone: "+1 (415) 555-0182",
    category: "FIRE",
    expectedOutcome: "Master Incident Ticket Created (Urgency 8-9/10)",
  },
  // 2. DUPLICATE 1: Same Fire within 25 meters (Spanish)
  {
    simId: "SIM-FIRE-DUPE-1",
    rawContent: "¡Fuego enorme en el edificio comercial de 5th Street! Hay mucho humo negro y llamas saliendo del techo. Veo personas atrapadas pidiendo auxilio en las ventanas.",
    latitude: 37.7751,
    longitude: -122.4192, // ~25m from master
    locationName: "5th St & Market Blvd",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "Maria Gonzalez",
    reporterPhone: "+1 (415) 555-0199",
    category: "FIRE",
    expectedOutcome: "MERGED into Master Fire Incident via Haversine (25m <= 250m)",
  },
  // 3. DUPLICATE 2: Same Fire within 30 meters (Hindi)
  {
    simId: "SIM-FIRE-DUPE-2",
    rawContent: "मार्केट और 5वीं स्ट्रीट के पास बड़ी इमारत में भीषण आग लगी है! सीढ़ियों पर भारी धुआं भर गया है और लोग ऊपर फंसे हुए हैं, तुरंत फायर ब्रिगेड भेजो!",
    latitude: 37.7747,
    longitude: -122.4196, // ~30m from master
    locationName: "Market St near 5th",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "Rajesh Sharma",
    reporterPhone: "+1 (415) 555-0211",
    category: "FIRE",
    expectedOutcome: "MERGED into Master Fire Incident via Haversine (30m <= 250m)",
  },
  // 4. SPAM / NOISE 1: Troll prank
  {
    simId: "SIM-SPAM-1",
    rawContent: "Free pizza delivery prank aliens invaded downtown haha lol click here for 50% discount coupon code test testing 123",
    latitude: 37.7700,
    longitude: -122.4100,
    locationName: "Downtown San Francisco",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "TrollUser420",
    reporterPhone: "+1 (415) 555-0000",
    category: "OTHER",
    expectedOutcome: "QUARANTINED AS NOISE (Credibility < 25) - Never sent to Dispatchers",
  },
  // 5. SPAM / NOISE 2: Keyboard mash / nonsense
  {
    simId: "SIM-SPAM-2",
    rawContent: "asdfghjkl qwertyuiop zxcvbnm 1234567890 testing prank lol lmfao hahaha",
    latitude: 37.7800,
    longitude: -122.4300,
    locationName: "Mission Plaza",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "SpammerBot",
    reporterPhone: "+1 (415) 555-0001",
    category: "OTHER",
    expectedOutcome: "QUARANTINED AS NOISE (Credibility < 25) - Filtered from Operational Map",
  },
  // 6. CRITICAL 1: Children trapped in fire - Severity 10/10 (Hindi)
  {
    simId: "SIM-CRITICAL-CHILDREN",
    rawContent: "तीसरी मंजिल पर 3 छोटे बच्चे आग की लपटों में फंसे हुए हैं! सीढ़ियां पूरी तरह जल चुकी हैं, वे सांस नहीं ले पा रहे हैं और धुआं अंदर भर रहा है! तुरंत हाइड्रोलिक क्रेन और बाल चिकित्सा एम्बुलेंस भेजो!",
    latitude: 37.7833,
    longitude: -122.4167,
    locationName: "Geary St & Leavenworth, Tenderloin",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "Sunita Patel",
    reporterPhone: "+1 (415) 555-0344",
    category: "FIRE",
    expectedOutcome: "TOP PRIORITY TICKET (Severity 10/10) - Trapped Children & Suffocation",
  },
  // 7. CRITICAL 2: Rapid flash flood with elderly on roof - Severity 9/10 (Spanish)
  {
    simId: "SIM-CRITICAL-FLOOD",
    rawContent: "¡El río se desbordó rápidamente por las lluvias torrenciales! El agua está subiendo al segundo piso y hay 4 personas ancianas atrapadas en el techo que no saben nadar. ¡Necesitamos botes de rescate urgente!",
    latitude: 37.7650,
    longitude: -122.4200,
    locationName: "Mission Creek, 18th & Folsom",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "Carlos Ramirez",
    reporterPhone: "+1 (415) 555-0455",
    category: "FLOOD",
    expectedOutcome: "HIGH PRIORITY TICKET (Severity 9/10) - Trapped Elderly & Rising Water",
  },
  // 8. CRITICAL 3: Building collapse trapped survivors - Severity 9/10 (Kannada)
  {
    simId: "SIM-CRITICAL-COLLAPSE",
    rawContent: "ನಾಲ್ಕು ಅಂತಸ್ತಿನ ಕಟ್ಟಡ ಕುಸಿದು ಬಿದ್ದಿದೆ, ಅವಶೇಷಗಳ ಅಡಿಯಲ್ಲಿ 6 ಜನರು ಸಿಲುಕಿಕೊಂಡಿದ್ದಾರೆ, ತೀವ್ರ ರಕ್ತಸ್ರಾವವಾಗುತ್ತಿದೆ, ದಯವಿಟ್ಟು ತಕ್ಷಣ ರಕ್ಷಣಾ ತಂಡವನ್ನು ಕಳುಹಿಸಿ!",
    latitude: 37.7580,
    longitude: -122.4140,
    locationName: "Potrero Hill Structural Sector",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "Anand Gowda",
    reporterPhone: "+1 (415) 555-0566",
    category: "STRUCTURAL_COLLAPSE",
    expectedOutcome: "HIGH PRIORITY TICKET (Severity 9/10) - Victims Trapped in Rubble",
  },
  // 9. CRITICAL 4: Toxic Chlorine Gas Leak - Severity 8/10 (English)
  {
    simId: "SIM-CRITICAL-HAZMAT",
    rawContent: "Overturned industrial tanker leaking concentrated chlorine gas! Yellow toxic gas cloud drifting towards school. Citizens coughing blood and vomiting, require immediate Level-A hazmat perimeter!",
    latitude: 37.7400,
    longitude: -122.4000,
    locationName: "Bayview Industrial Terminal",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "Hazmat Supervisor Chen",
    reporterPhone: "+1 (415) 555-0677",
    category: "HAZMAT",
    expectedOutcome: "HIGH PRIORITY TICKET (Severity 8/10) - Toxic Chemical Hazmat Threat",
  },
  // 10. MODERATE 5: Downed tree on roadway - Severity 5/10 (English)
  {
    simId: "SIM-MODERATE-TREE",
    rawContent: "Large eucalyptus tree fell across dual carriageway during gale winds, crushed one parked empty sedan. Road is completely blocked. No injuries, no victims trapped.",
    latitude: 37.7690,
    longitude: -122.4460,
    locationName: "Buena Vista & Haight St",
    city: "San Francisco",
    district: SIMULATION_TAG,
    reporterName: "David Miller",
    reporterPhone: "+1 (415) 555-0788",
    category: "OTHER",
    expectedOutcome: "MODERATE TICKET (Severity 5/10) - Proper Queue Demotion Below Life Threats",
  },
];
