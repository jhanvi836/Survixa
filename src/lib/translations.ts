export type SupportedLanguage = "en" | "hi" | "kn" | "es";

export interface PortalTranslations {
  title: string;
  subtitle: string;
  offlineBanner: string;
  offlineBannerDesc: string;
  onlineBanner: string;
  selectHazard: string;
  hazards: {
    medical: { name: string; desc: string };
    fire: { name: string; desc: string };
    flood: { name: string; desc: string };
    collapse: { name: string; desc: string };
  };
  describeEmergency: string;
  describePlaceholder: string;
  voiceButton: string;
  listening: string;
  gpsTitle: string;
  gpsAcquiring: string;
  gpsSuccess: string;
  gpsManual: string;
  reacquireGps: string;
  toggleManualPin: string;
  locationPlaceholder: string;
  photoEvidence: string;
  compressing: string;
  compressedBadge: string;
  reporterName: string;
  reporterPhone: string;
  submitButton: string;
  submittingButton: string;
  offlineSubmitButton: string;
  trackExistingTitle: string;
  trackPlaceholder: string;
  trackButton: string;
  footerNotice: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, PortalTranslations> = {
  en: {
    title: "Citizen Emergency Portal",
    subtitle: "Real-time AI triage & direct multi-agency dispatch",
    offlineBanner: "Queued Offline — Will Auto-Send",
    offlineBannerDesc: "No internet connection detected. Your emergency report is secured on your device and will be transmitted the second connectivity returns.",
    onlineBanner: "Connection Restored! Transmitting queued distress calls...",
    selectHazard: "Select Emergency Type (One-Tap):",
    hazards: {
      medical: { name: "Medical / Trauma", desc: "Severe bleeding, cardiac, unconscious, severe injury" },
      fire: { name: "Active Fire", desc: "Building fire, forest fire, explosion, heavy smoke" },
      flood: { name: "Flash Flood", desc: "Rising water, river overflow, trapped on roof, drowning" },
      collapse: { name: "Building Collapse", desc: "Rubble, trapped victims, landslide, structural failure" },
    },
    describeEmergency: "Describe What You See & Need:",
    describePlaceholder: "Speak or type in any language. E.g., 'Two people trapped in rising water near the bridge, need rescue boat'...",
    voiceButton: "Speak Emergency (Mic)",
    listening: "Listening... Speak now",
    gpsTitle: "Live GPS Location Telemetry",
    gpsAcquiring: "Acquiring precise satellite GPS...",
    gpsSuccess: "GPS Locked (+/- 5m accuracy)",
    gpsManual: "Manual Pin Placement Mode",
    reacquireGps: "Re-Detect GPS",
    toggleManualPin: "Adjust Pin Manually",
    locationPlaceholder: "Nearby landmark, road, building number, or sector...",
    photoEvidence: "Attach Damage Photo (Auto-Compressed for Weak Signal)",
    compressing: "Compressing photo on device...",
    compressedBadge: "Compressed for 2G/3G speeds",
    reporterName: "Your Name (Optional)",
    reporterPhone: "Phone / SMS for rescue unit callbacks (Optional)",
    submitButton: "TRANSMIT EMERGENCY REPORT NOW",
    submittingButton: "TRANSMITTING TO JOINT COMMAND...",
    offlineSubmitButton: "QUEUE EMERGENCY REPORT LOCALLY",
    trackExistingTitle: "Track An Existing Emergency Report",
    trackPlaceholder: "e.g. SVX-FL-9021",
    trackButton: "Track Live",
    footerNotice: "Emergency telemetry is encrypted and routed directly to Joint Command (Fire, Medical, Police, NGO).",
  },
  hi: {
    title: "नागरिक आपातकालीन पोर्टल",
    subtitle: "रीयल-टाइम एआई ट्राइएज और संयुक्त राहत दल प्रेषण",
    offlineBanner: "ऑफ़लाइन कतारबद्ध — स्वतः भेजा जाएगा",
    offlineBannerDesc: "इंटरनेट कनेक्शन नहीं है। आपकी आपातकालीन रिपोर्ट डिवाइस पर सुरक्षित है और सिग्नल आते ही स्वतः प्रेषित हो जाएगी।",
    onlineBanner: "इंटरनेट पुनः सक्रिय! कतारबद्ध आपातकालीन रिपोर्ट भेजी जा रही है...",
    selectHazard: "आपातकाल का प्रकार चुनें (एक स्पर्श):",
    hazards: {
      medical: { name: "चिकित्सा आपातकाल", desc: "गंभीर रक्तस्राव, बेहोशी, दिल का दौरा, गंभीर चोट" },
      fire: { name: "भीषण आग", desc: "इमारत में आग, जंगल की आग, विस्फोट, जहरीला धुआं" },
      flood: { name: "बाढ़ / जलभराव", desc: "बढ़ता पानी, नदी का जलस्तर, छत पर फंसे लोग, डूबना" },
      collapse: { name: "इमारत ढहना", desc: "मलबे में फंसे लोग, भूस्खलन, संरचनात्मक क्षति" },
    },
    describeEmergency: "स्थिति और आवश्यकता का विवरण दें:",
    describePlaceholder: "अपनी भाषा में बोलें या लिखें। जैसे: 'पुल के पास 3 लोग बाढ़ के पानी में फंसे हैं, तुरंत नाव भेजिए'...",
    voiceButton: "बोलकर दर्ज करें (माइक)",
    listening: "सुन रहे हैं... कृपया बोलें",
    gpsTitle: "लाइव जीपीएस स्थान टेलीमेट्री",
    gpsAcquiring: "सटीक जीपीएस स्थान खोजा जा रहा है...",
    gpsSuccess: "जीपीएस लॉक (+/- 5 मीटर सटीकता)",
    gpsManual: "मैन्युअल पिन स्थिति मोड",
    reacquireGps: "जीपीएस पुनः खोजें",
    toggleManualPin: "मैन्युअल पिन बदलें",
    locationPlaceholder: "निकटतम लैंडमार्क, सड़क, भवन संख्या या सेक्टर...",
    photoEvidence: "तस्वीर जोड़ें (कमजोर नेटवर्क के लिए स्वचालित संपीड़ित)",
    compressing: "तस्वीर का आकार छोटा किया जा रहा है...",
    compressedBadge: "2जी/3जी गति के लिए अनुकूलित",
    reporterName: "आपका नाम (वैकल्पिक)",
    reporterPhone: "फ़ोन नंबर (राहत दल संपर्क हेतु, वैकल्पिक)",
    submitButton: "आपातकालीन रिपोर्ट तुरंत भेजें",
    submittingButton: "कमांड सेंटर को भेजा जा रहा है...",
    offlineSubmitButton: "रिपोर्ट डिवाइस पर सुरक्षित रखें",
    trackExistingTitle: "दर्ज आपातकालीन रिपोर्ट ट्रैक करें",
    trackPlaceholder: "उदा. SVX-FL-9021",
    trackButton: "लाइव ट्रैक करें",
    footerNotice: "आपातकालीन सूचना सीधे अग्निशमन, चिकित्सा, पुलिस और एनजीओ संयुक्त कमान को भेजी जाती है।",
  },
  kn: {
    title: "ನಾಗರಿಕ ತುರ್ತು ಪ್ರತಿಕ್ರಿಯೆ ಪೋರ್ಟಲ್",
    subtitle: "ನೈಜ-ಸಮಯದ ಎಐ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಜಂಟಿ ರಕ್ಷಣಾ ತಂಡ ರವಾನೆ",
    offlineBanner: "ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದೆ — ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕಳುಹಿಸಲಾಗುತ್ತದೆ",
    offlineBannerDesc: "ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕವಿಲ್ಲ. ನಿಮ್ಮ ತುರ್ತು ವರದಿಯನ್ನು ಸಾಧನದಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿಡಲಾಗಿದೆ ಮತ್ತು ನೆಟ್‌ವರ್ಕ್ ಬಂದ ತಕ್ಷಣ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.",
    onlineBanner: "ಸಂಪರ್ಕ ಮರುಸ್ಥಾಪಿಸಲಾಗಿದೆ! ವರದಿ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...",
    selectHazard: "ತುರ್ತು ಪರಿಸ್ಥಿತಿಯ ಪ್ರಕಾರವನ್ನು ಆರಿಸಿ (ಒಂದು ಸ್ಪರ್ಶ):",
    hazards: {
      medical: { name: "ವೈದ್ಯಕೀಯ ತುರ್ತು", desc: "ತೀವ್ರ ರಕ್ತಸ್ರಾವ, ಪ್ರಜ್ಞಾಹೀನತೆ, ಹೃದಯಾಘಾತ, ಗಂಭೀರ ಗಾಯ" },
      fire: { name: "ಬೆಂಕಿ ಅವಘಡ", desc: "ಕಟ್ಟಡಕ್ಕೆ ಬೆಂಕಿ, ಅರಣ್ಯ ಬೆಂಕಿ, ಸ್ಫೋಟ, ದಟ್ಟ ಹೊಗೆ" },
      flood: { name: "ಪ್ರವಾಹ / ಜಲಾವೃತ", desc: "ಏರುತ್ತಿರುವ ನೀರು, ನದಿ ಉಕ್ಕಿ ಹರಿಯುವುದು, ಮೇಲ್ಛಾವಣಿಯಲ್ಲಿ ಸಿಲುಕಿದವರು" },
      collapse: { name: "ಕಟ್ಟಡ ಕುಸಿತ", desc: "ಅವಶೇಷಗಳಲ್ಲಿ ಸಿಲುಕಿದ ಜನರು, ಭೂಕುಸಿತ, ರಚನಾತ್ಮಕ ಕುಸಿತ" },
    },
    describeEmergency: "ಪರಿಸ್ಥಿತಿ ಮತ್ತು ಅಗತ್ಯ ವಿವರಗಳನ್ನು ನೀಡಿ:",
    describePlaceholder: "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಬರೆಯಿರಿ. ಉದಾ: 'ಸೇತುವೆಯ ಬಳಿ ನೀರಿನಲ್ಲಿ ಇಬ್ಬರು ಸಿಲುಕಿಕೊಂಡಿದ್ದಾರೆ, ರಕ್ಷಣಾ ದೋಣಿ ಬೇಕು'...",
    voiceButton: "ಧ್ವನಿ ಮೂಲಕ ಹೇಳಿ (ಮೈಕ್)",
    listening: "ಕೇಳಿಸಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ... ಮಾತನಾಡಿ",
    gpsTitle: "ಲೈವ್ ಜಿಪಿಎಸ್ ಸ್ಥಳ ಟೆಲಿಮೆಟ್ರಿ",
    gpsAcquiring: "ಜಿಪಿಎಸ್ ಸ್ಥಳ ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
    gpsSuccess: "ಜಿಪಿಎಸ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ (+/- 5 ಮೀಟರ್)",
    gpsManual: "ಮ್ಯಾನ್ಯುವಲ್ ಪಿನ್ ಮೋಡ್",
    reacquireGps: "ಜಿಪಿಎಸ್ ಮರುಪಡೆಯಿರಿ",
    toggleManualPin: "ಸ್ಥಳವನ್ನು ನೀವೇ ಗುರುತಿಸಿ",
    locationPlaceholder: "ಹತ್ತಿರದ ಹೆಗ್ಗುರುತು, ರಸ್ತೆ, ಮನೆ ಸಂಖ್ಯೆ...",
    photoEvidence: "ಫೋಟೋ ಲಗತ್ತಿಸಿ (ಕಡಿಮೆ ನೆಟ್‌ವರ್ಕ್‌ಗಾಗಿ ಸಂಕುಚಿತಗೊಳಿಸಲಾಗಿದೆ)",
    compressing: "ಚಿತ್ರವನ್ನು ಕುಗ್ಗಿಸಲಾಗುತ್ತಿದೆ...",
    compressedBadge: "2G/3G ವೇಗಕ್ಕೆ ಸಿದ್ಧವಾಗಿದೆ",
    reporterName: "ನಿಮ್ಮ ಹೆಸರು (ಐಚ್ಛಿಕ)",
    reporterPhone: "ಫೋನ್ ಸಂಖ್ಯೆ (ಐಚ್ಛಿಕ)",
    submitButton: "ತುರ್ತು ವರದಿಯನ್ನು ಈಗಲೇ ಕಳುಹಿಸಿ",
    submittingButton: "ಕಮಾಂಡ್ ಸೆಂಟರ್‌ಗೆ ರವಾನಿಸಲಾಗುತ್ತಿದೆ...",
    offlineSubmitButton: "ವರದಿಯನ್ನು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಉಳಿಸಿ",
    trackExistingTitle: "ವರದಿಯ ಪ್ರಗತಿಯನ್ನು ಲೈವ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    trackPlaceholder: "ಉದಾ. SVX-FL-9021",
    trackButton: "ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    footerNotice: "ತುರ್ತು ಮಾಹಿತಿಯನ್ನು ನೇರವಾಗಿ ಅಗ್ನಿಶಾಮಕ, ವೈದ್ಯಕೀಯ ಮತ್ತು ಪೊಲೀಸ್ ಜಂಟಿ ಕಮಾಂಡ್‌ಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.",
  },
  es: {
    title: "Portal de Emergencia Ciudadana",
    subtitle: "Triaje con IA en tiempo real y despacho multiagencia directo",
    offlineBanner: "En Cola Sin Conexión — Se Enviará Automáticamente",
    offlineBannerDesc: "Sin conexión a internet. Su reporte de emergencia está guardado en su dispositivo y se transmitirá en cuanto se restablezca la señal.",
    onlineBanner: "¡Conexión restablecida! Transmitiendo reportes en cola...",
    selectHazard: "Seleccione el Tipo de Emergencia (Un Toque):",
    hazards: {
      medical: { name: "Emergencia Médica", desc: "Hemorragia severa, paro cardíaco, inconsciente, trauma grave" },
      fire: { name: "Incendio Activo", desc: "Fuego en edificio, incendio forestal, explosión, humo tóxico" },
      flood: { name: "Inundación / Riada", desc: "Subida rápida del agua, río desbordado, atrapados en techo, ahogamiento" },
      collapse: { name: "Derrumbe de Estructura", desc: "Personas bajo escombros, deslave, colapso de edificio" },
    },
    describeEmergency: "Describa lo que ve y lo que necesita:",
    describePlaceholder: "Hable o escriba en cualquier idioma. Ej: 'Dos personas atrapadas en el techo cerca del río, el agua sube rápido'...",
    voiceButton: "Grabar por Voz (Mic)",
    listening: "Escuchando... Hable ahora",
    gpsTitle: "Telemetría de Ubicación GPS en Vivo",
    gpsAcquiring: "Adquiriendo GPS satelital preciso...",
    gpsSuccess: "GPS Fijado (+/- 5m de precisión)",
    gpsManual: "Modo de Marcador Manual",
    reacquireGps: "Volver a Detectar GPS",
    toggleManualPin: "Ajustar Pin Manualmente",
    locationPlaceholder: "Punto de referencia cercano, calle, cruce o número de edificio...",
    photoEvidence: "Adjuntar Foto del Daño (Comprimida para Conexión Débil)",
    compressing: "Comprimiendo imagen en el dispositivo...",
    compressedBadge: "Optimizada para redes 2G/3G lentas",
    reporterName: "Su Nombre (Opcional)",
    reporterPhone: "Teléfono / SMS para contacto de rescate (Opcional)",
    submitButton: "TRANSMITIR REPORTE DE EMERGENCIA AHORA",
    submittingButton: "TRANSMITIENDO A COMANDO CONJUNTO...",
    offlineSubmitButton: "GUARDAR REPORTE LOCALMENTE",
    trackExistingTitle: "Rastrear un Reporte de Emergencia Existente",
    trackPlaceholder: "ej. SVX-FL-9021",
    trackButton: "Rastrear en Vivo",
    footerNotice: "La información de emergencia se cifra y se transmite directamente al Comando Conjunto (Bomberos, Médicos, Policía, ONG).",
  },
};
