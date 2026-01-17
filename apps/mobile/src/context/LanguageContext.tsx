import { createContext, useContext, useState, type ReactNode } from 'react'

export type Language = 'en' | 'hi' | 'bn'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    welcome: 'Welcome',
    home: 'Home',
    machines: 'Machines',
    mandi: 'Mandi',
    bookings: 'Bookings',
    profile: 'Profile',
    logout: 'Logout',
    
    // Home Page
    subtitle: 'What would you like to do today?',
    bookMachine: 'Book Machine',
    bookDesc: 'Reserve equipment for your field',
    myBookings: 'My Bookings',
    bookingsDesc: 'Track your reservations',
    availableMachines: 'Available Machines',
    nearYou: 'Near You',
    available: '✓ Available',
    working: '⚡ Working',
    noMachines: 'No machines available',
    finding: 'Finding nearest machines...',
    bookNow: 'Book Now',
    viewAll: 'View All',
    voiceTitle: 'Voice Assistant Available',
    voiceDesc: 'Use voice commands on booking page',
    greenCertified: '🌿 Green Certified',
    
    // Mandi Page
    mandiPrices: 'Mandi Prices',
    liveCropRates: 'Live crop rates',
    crops: 'Crops',
    mandis: 'Mandis',
    rising: 'Rising',
    falling: 'Falling',
    todayRates: "Today's Rates",
    priceHistory: 'Price History',
    selectCrop: 'Select Crop',
    selectMandi: 'Select Mandi',
    soilWealthReport: 'Soil Wealth Report',
    stopBurningMoney: 'STOP BURNING YOUR OWN MONEY',
    fertilizerLossCalc: 'Fertilizer Loss Calculator',
    burningDestroys: 'Burning 1 Acre destroys:',
    ureaLoss: 'Urea (Nitrogen)',
    dapLoss: 'DAP (Phosphorus)',
    potashLoss: 'Potash',
    totalCashLoss: 'Total Cash Loss',
    perAcre: 'per acre',
    nutrientSaved: 'Nutrient Value Saved',
    waterSaved: 'Water Saved',
    liters: 'Liters',
    yieldPrediction: 'Yield Prediction',
    withoutCRM: 'Without CRM (Burning)',
    withCRM: 'With CRM (Mulching)',
    quintalsPerAcre: 'Quintals/acre',
    extraIncome: 'Extra Income',
    inNextHarvest: 'in next wheat harvest',
    priceChart: 'Price Trend (7 Days)',
    compareMandiPrices: 'Compare Mandi Prices',
    
    // Booking
    booking: 'Book Machine',
    chooseCrop: 'Select your crop',
    confirmBooking: 'Confirm Booking',
    success: 'Booking successful!',
    crop: 'Select Crop',
    area: 'Land (acres)',
    location: 'Location',
    machine: 'Machine',
    confirm: 'Book Now',
    acres: 'acres',
    name: 'Name',
    phone: 'Phone',
    next: 'Next',
    askAcres: 'How many acres?',
    askLocation: 'Say village name',
    
    // Bookings Page
    totalBookings: 'Total Bookings',
    pending: 'Pending',
    all: 'All',
    active: 'Active',
    past: 'Past',
    noBookingsFound: 'No bookings found',
    bookingHistory: 'Your booking history will appear here',
    bookingDate: 'Booking Date',
    cancelBooking: 'Cancel Booking',
    
    // Machines Page
    searchMachines: 'Search machines...',
    offline: 'Offline',
    noMachinesFound: 'No machines found',
    adjustFilters: 'Try adjusting your search or filters',
    connectingServer: 'Connecting to server...',
    
    // Profile Page
    farmDetails: 'Farm Details',
    farmSize: 'Farm Size',
    hectares: 'hectares',
    notSpecified: 'Not specified',
    quickActions: 'Quick Actions',
    greenCertificate: 'Green Certificate',
    mandiPricesNav: 'Mandi Prices',
    settings: 'Settings',
    pushNotifications: 'Push Notifications',
    updatePhone: 'Update Phone Number',
    changePin: 'Change PIN',
    support: 'Support',
    contactHelpline: 'Contact Helpline',
    faqs: 'FAQs',
    greenCredits: 'Green Credits',
  },
  hi: {
    // Common
    welcome: 'नमस्ते',
    home: 'होम',
    machines: 'मशीनें',
    mandi: 'मंडी',
    bookings: 'बुकिंग',
    profile: 'प्रोफाइल',
    logout: 'लॉगआउट',
    
    // Home Page
    subtitle: 'आज आप क्या करना चाहेंगे?',
    bookMachine: 'मशीन बुक करें',
    bookDesc: 'अपने खेत के लिए उपकरण आरक्षित करें',
    myBookings: 'मेरी बुकिंग',
    bookingsDesc: 'अपने आरक्षण ट्रैक करें',
    availableMachines: 'उपलब्ध मशीनें',
    nearYou: 'आपके पास',
    available: '✓ उपलब्ध',
    working: '⚡ काम कर रही',
    noMachines: 'कोई मशीन उपलब्ध नहीं',
    finding: 'नजदीकी मशीनें खोज रहे हैं...',
    bookNow: 'अभी बुक करें',
    viewAll: 'सभी देखें',
    voiceTitle: 'वॉइस असिस्टेंट उपलब्ध',
    voiceDesc: 'बुकिंग पेज पर वॉइस कमांड का उपयोग करें',
    greenCertified: '🌿 ग्रीन प्रमाणित',
    
    // Mandi Page
    mandiPrices: 'मंडी भाव',
    liveCropRates: 'लाइव फसल दरें',
    crops: 'फसलें',
    mandis: 'मंडियां',
    rising: 'बढ़ रहा',
    falling: 'गिर रहा',
    todayRates: 'आज की दरें',
    priceHistory: 'मूल्य इतिहास',
    selectCrop: 'फसल चुनें',
    selectMandi: 'मंडी चुनें',
    soilWealthReport: 'मिट्टी संपत्ति रिपोर्ट',
    stopBurningMoney: 'अपना पैसा जलाना बंद करें',
    fertilizerLossCalc: 'खाद नुकसान कैलकुलेटर',
    burningDestroys: '1 एकड़ जलाने से नष्ट होता है:',
    ureaLoss: 'यूरिया (नाइट्रोजन)',
    dapLoss: 'डीएपी (फॉस्फोरस)',
    potashLoss: 'पोटाश',
    totalCashLoss: 'कुल नकद नुकसान',
    perAcre: 'प्रति एकड़',
    nutrientSaved: 'पोषक तत्व बचाया',
    waterSaved: 'पानी बचाया',
    liters: 'लीटर',
    yieldPrediction: 'उपज भविष्यवाणी',
    withoutCRM: 'CRM के बिना (जलाना)',
    withCRM: 'CRM के साथ (मल्चिंग)',
    quintalsPerAcre: 'क्विंटल/एकड़',
    extraIncome: 'अतिरिक्त आय',
    inNextHarvest: 'अगली गेहूं की फसल में',
    priceChart: 'मूल्य रुझान (7 दिन)',
    compareMandiPrices: 'मंडी भाव तुलना',
    
    // Booking
    booking: 'मशीन बुक करें',
    chooseCrop: 'अपनी फसल चुनें',
    confirmBooking: 'बुकिंग पुष्टि',
    success: 'बुकिंग सफल!',
    crop: 'फसल चुनें',
    area: 'जमीन (एकड़)',
    location: 'स्थान',
    machine: 'मशीन',
    confirm: 'बुकिंग करें',
    acres: 'एकड़',
    name: 'नाम',
    phone: 'फोन',
    next: 'आगे',
    askAcres: 'कितने एकड़ जमीन है?',
    askLocation: 'गांव का नाम बोलें',
    
    // Bookings Page
    totalBookings: 'कुल बुकिंग',
    pending: 'लंबित',
    all: 'सभी',
    active: 'सक्रिय',
    past: 'पिछली',
    noBookingsFound: 'कोई बुकिंग नहीं मिली',
    bookingHistory: 'आपकी बुकिंग यहां दिखाई देगी',
    bookingDate: 'बुकिंग की तारीख',
    cancelBooking: 'बुकिंग रद्द करें',
    
    // Machines Page
    searchMachines: 'मशीनें खोजें...',
    offline: 'ऑफलाइन',
    noMachinesFound: 'कोई मशीन नहीं मिली',
    adjustFilters: 'खोज या फ़िल्टर बदलें',
    connectingServer: 'सर्वर से कनेक्ट हो रहा है...',
    
    // Profile Page
    farmDetails: 'खेत विवरण',
    farmSize: 'खेत का आकार',
    hectares: 'हेक्टेयर',
    notSpecified: 'निर्दिष्ट नहीं',
    quickActions: 'त्वरित कार्य',
    greenCertificate: 'ग्रीन प्रमाणपत्र',
    mandiPricesNav: 'मंडी भाव',
    settings: 'सेटिंग्स',
    pushNotifications: 'पुश नोटिफिकेशन',
    updatePhone: 'फोन नंबर अपडेट करें',
    changePin: 'पिन बदलें',
    support: 'सहायता',
    contactHelpline: 'हेल्पलाइन से संपर्क करें',
    faqs: 'अक्सर पूछे जाने वाले प्रश्न',
    greenCredits: 'ग्रीन क्रेडिट',
  },
  bn: {
    // Common
    welcome: 'স্বাগতম',
    home: 'হোম',
    machines: 'মেশিন',
    mandi: 'মান্ডি',
    bookings: 'বুকিং',
    profile: 'প্রোফাইল',
    logout: 'লগআউট',
    
    // Home Page
    subtitle: 'আজ আপনি কি করতে চান?',
    bookMachine: 'মেশিন বুক করুন',
    bookDesc: 'আপনার জমির জন্য সরঞ্জাম সংরক্ষণ করুন',
    myBookings: 'আমার বুকিং',
    bookingsDesc: 'আপনার রিজার্ভেশন ট্র্যাক করুন',
    availableMachines: 'উপলব্ধ মেশিন',
    nearYou: 'আপনার কাছে',
    available: '✓ উপলব্ধ',
    working: '⚡ কাজ করছে',
    noMachines: 'কোন মেশিন উপলব্ধ নেই',
    finding: 'নিকটতম মেশিন খুঁজছি...',
    bookNow: 'এখনই বুক করুন',
    viewAll: 'সব দেখুন',
    voiceTitle: 'ভয়েস সহকারী উপলব্ধ',
    voiceDesc: 'বুকিং পেজে ভয়েস কমান্ড ব্যবহার করুন',
    greenCertified: '🌿 গ্রিন সার্টিফাইড',
    
    // Mandi Page
    mandiPrices: 'মান্ডি দাম',
    liveCropRates: 'লাইভ ফসলের দাম',
    crops: 'ফসল',
    mandis: 'মান্ডি',
    rising: 'বাড়ছে',
    falling: 'কমছে',
    todayRates: 'আজকের দাম',
    priceHistory: 'মূল্য ইতিহাস',
    selectCrop: 'ফসল নির্বাচন করুন',
    selectMandi: 'মান্ডি নির্বাচন করুন',
    soilWealthReport: 'মাটি সম্পদ রিপোর্ট',
    stopBurningMoney: 'আপনার টাকা পোড়ানো বন্ধ করুন',
    fertilizerLossCalc: 'সার ক্ষতি ক্যালকুলেটর',
    burningDestroys: '১ একর পোড়ালে নষ্ট হয়:',
    ureaLoss: 'ইউরিয়া (নাইট্রোজেন)',
    dapLoss: 'ডিএপি (ফসফরাস)',
    potashLoss: 'পটাশ',
    totalCashLoss: 'মোট নগদ ক্ষতি',
    perAcre: 'প্রতি একর',
    nutrientSaved: 'পুষ্টি মূল্য সংরক্ষিত',
    waterSaved: 'জল সংরক্ষিত',
    liters: 'লিটার',
    yieldPrediction: 'ফলন পূর্বাভাস',
    withoutCRM: 'CRM ছাড়া (পোড়ানো)',
    withCRM: 'CRM সহ (মালচিং)',
    quintalsPerAcre: 'কুইন্টাল/একর',
    extraIncome: 'অতিরিক্ত আয়',
    inNextHarvest: 'পরবর্তী গম ফসলে',
    priceChart: 'মূল্য প্রবণতা (৭ দিন)',
    compareMandiPrices: 'মান্ডি দাম তুলনা',
    
    // Booking
    booking: 'মেশিন বুক',
    chooseCrop: 'ফসল নির্বাচন করুন',
    confirmBooking: 'বুকিং নিশ্চিত',
    success: 'বুকিং সফল!',
    crop: 'ফসল নির্বাচন',
    area: 'জমি (বিঘা)',
    location: 'অবস্থান',
    machine: 'মেশিন',
    confirm: 'বুক করুন',
    acres: 'বিঘা',
    name: 'নাম',
    phone: 'ফোন',
    next: 'পরবর্তী',
    askAcres: 'কত বিঘা জমি?',
    askLocation: 'গ্রামের নাম বলুন',
    
    // Bookings Page
    totalBookings: 'মোট বুকিং',
    pending: 'অপেক্ষমান',
    all: 'সব',
    active: 'সক্রিয়',
    past: 'অতীত',
    noBookingsFound: 'কোন বুকিং পাওয়া যায়নি',
    bookingHistory: 'আপনার বুকিং ইতিহাস এখানে দেখা যাবে',
    bookingDate: 'বুকিং তারিখ',
    cancelBooking: 'বুকিং বাতিল করুন',
    
    // Machines Page
    searchMachines: 'মেশিন খুঁজুন...',
    offline: 'অফলাইন',
    noMachinesFound: 'কোন মেশিন পাওয়া যায়নি',
    adjustFilters: 'অনুসন্ধান বা ফিল্টার পরিবর্তন করুন',
    connectingServer: 'সার্ভারে সংযোগ হচ্ছে...',
    
    // Profile Page
    farmDetails: 'খামার বিবরণ',
    farmSize: 'খামারের আকার',
    hectares: 'হেক্টর',
    notSpecified: 'নির্দিষ্ট নয়',
    quickActions: 'দ্রুত কাজ',
    greenCertificate: 'গ্রিন সার্টিফিকেট',
    mandiPricesNav: 'মান্ডি দাম',
    settings: 'সেটিংস',
    pushNotifications: 'পুশ নোটিফিকেশন',
    updatePhone: 'ফোন নম্বর আপডেট করুন',
    changePin: 'পিন পরিবর্তন করুন',
    support: 'সহায়তা',
    contactHelpline: 'হেল্পলাইনে যোগাযোগ করুন',
    faqs: 'প্রায়শই জিজ্ঞাসিত প্রশ্ন',
    greenCredits: 'গ্রিন ক্রেডিট',
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('app_language')
    return (saved as Language) || 'en'
  })

  // Persist language changes to localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('app_language', lang)
  }

  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
