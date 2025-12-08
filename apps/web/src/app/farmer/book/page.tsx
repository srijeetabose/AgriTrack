'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, MicOff, Tractor, ArrowLeft, Wifi, WifiOff, Volume2, Leaf, ChevronDown, ChevronUp, Search, CheckCircle, Circle } from 'lucide-react';
import cropMachinesData from '@/data/crop-machines.json';

// Types for crop-machines.json
interface CropData {
  id: string;
  names: { en: string; hi: string; pa: string };
  aliases: string[];
  season: string;
  machines: string[];
  icon: string;
  description: { en: string; hi: string };
}

interface MachineData {
  description: { en: string; hi: string };
  benefits: string[];
  crops: string[];
}

// Bengali crop name mappings
const BENGALI_CROP_NAMES: { [key: string]: string } = {
  'ধান': 'rice',
  'গম': 'wheat',
  'ভুট্টা': 'maize',
  'আখ': 'sugarcane',
  'তুলা': 'cotton',
  'সয়াবিন': 'soybean',
  'সরিষা': 'mustard',
  'চিনাবাদাম': 'groundnut',
  'আলু': 'potato',
  'পেঁয়াজ': 'onion',
  'টমেটো': 'tomato',
  'বাজরা': 'bajra',
  'জোয়ার': 'jowar',
  'ডাল': 'pulses',
  'মসুর': 'lentils',
  'ছোলা': 'chickpea',
  'পাট': 'jute',
  // Common cultivation terms
  'চাষ': '', // "cultivation"
  'করি': '', // "do/cultivate"
};

// Build lookup map from JSON for voice recognition
const buildCropLookup = () => {
  const lookup: { [key: string]: CropData } = {};
  
  cropMachinesData.crops.forEach((crop: CropData) => {
    // Add all language variations and aliases as keys
    lookup[crop.names.en.toLowerCase()] = crop;
    lookup[crop.names.hi] = crop;
    lookup[crop.names.pa] = crop;
    crop.aliases.forEach(alias => {
      lookup[alias.toLowerCase()] = crop;
    });
  });
  
  // Add Bengali mappings
  for (const [bengaliName, englishId] of Object.entries(BENGALI_CROP_NAMES)) {
    if (englishId && lookup[englishId]) {
      lookup[bengaliName] = lookup[englishId];
    }
  }
  
  return lookup;
};

const CROP_LOOKUP = buildCropLookup();

// Number words in multiple languages for parsing
const NUMBER_WORDS: { [key: string]: number } = {
  // English
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20,
  'twenty five': 25, 'thirty': 30, 'fifty': 50, 'hundred': 100,
  'half': 0.5, 'quarter': 0.25,
  // Hindi
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'पंद्रह': 15, 'बीस': 20,
  'पच्चीस': 25, 'तीस': 30, 'पचास': 50, 'सौ': 100,
  'आधा': 0.5, 'डेढ़': 1.5, 'ढाई': 2.5,
  // Punjabi
  'ਇੱਕ': 1, 'ਦੋ': 2, 'ਤਿੰਨ': 3, 'ਚਾਰ': 4, 'ਪੰਜ': 5,
  'ਛੇ': 6, 'ਸੱਤ': 7, 'ਅੱਠ': 8, 'ਨੌਂ': 9, 'ਦਸ': 10,
  // Bengali
  'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5,
  'ছয়': 6, 'সাত': 7, 'আট': 8, 'নয়': 9, 'দশ': 10,
  'এগারো': 11, 'বারো': 12, 'পনের': 15, 'কুড়ি': 20,
  'পঁচিশ': 25, 'ত্রিশ': 30, 'পঞ্চাশ': 50, 'একশ': 100,
};

// Common village/location keywords
const LOCATION_KEYWORDS = {
  english: ['village', 'town', 'city', 'district', 'block', 'near', 'at', 'from', 'location', 'place', 'area'],
  hindi: ['गांव', 'गाँव', 'शहर', 'जिला', 'ब्लॉक', 'पास', 'से', 'में', 'जगह', 'क्षेत्र', 'तहसील'],
  punjabi: ['ਪਿੰਡ', 'ਸ਼ਹਿਰ', 'ਜ਼ਿਲ੍ਹਾ', 'ਨੇੜੇ', 'ਤੋਂ', 'ਵਿੱਚ', 'ਥਾਂ', 'ਇਲਾਕਾ'],
  bengali: ['গ্রাম', 'শহর', 'জেলা', 'ব্লক', 'কাছে', 'থেকে', 'এলাকা', 'জায়গা']
};

// Name keywords
const NAME_KEYWORDS = {
  english: ['name is', 'my name', 'i am', "i'm", 'called', 'this is'],
  hindi: ['नाम', 'मेरा नाम', 'मैं', 'बोल रहा', 'बोल रही'],
  punjabi: ['ਨਾਮ', 'ਮੇਰਾ ਨਾਮ', 'ਮੈਂ'],
  bengali: ['নাম', 'আমার নাম', 'আমি']
};

// Phone keywords  
const PHONE_KEYWORDS = {
  english: ['phone', 'number', 'mobile', 'call', 'contact'],
  hindi: ['फोन', 'नंबर', 'मोबाइल', 'फ़ोन'],
  punjabi: ['ਫੋਨ', 'ਨੰਬਰ', 'ਮੋਬਾਈਲ'],
  bengali: ['ফোন', 'নম্বর', 'মোবাইল']
};

// Land area keywords
const LAND_KEYWORDS = {
  english: ['acre', 'acres', 'land', 'field', 'area', 'bigha', 'hectare'],
  hindi: ['एकड़', 'बीघा', 'हेक्टेयर', 'जमीन', 'खेत', 'क्षेत्र'],
  punjabi: ['ਏਕੜ', 'ਬੀਘਾ', 'ਜ਼ਮੀਨ', 'ਖੇਤ'],
  bengali: ['একর', 'বিঘা', 'হেক্টর', 'জমি', 'ক্ষেত্র']
};

// Machine name variations
const MACHINE_KEYWORDS: { [key: string]: string[] } = {
  'happy seeder': ['happy seeder', 'हैप्पी सीडर', 'हैपी सीडर', 'ਹੈਪੀ ਸੀਡਰ', 'হ্যাপি সিডার'],
  'straw baler': ['straw baler', 'स्ट्रॉ बेलर', 'बेलर', 'ਸਟ੍ਰਾਅ ਬੇਲਰ', 'স্ট্র বেলার'],
  'mulcher': ['mulcher', 'मल्चर', 'ਮਲਚਰ', 'মালচার'],
  'rotavator': ['rotavator', 'रोटावेटर', 'ਰੋਟਾਵੇਟਰ', 'রোটাভেটর'],
  'shredder': ['shredder', 'श्रेडर', 'ਸ਼੍ਰੈਡਰ', 'শ্রেডার'],
  'combine harvester': ['combine', 'harvester', 'कम्बाइन', 'हार्वेस्टर', 'ਕੰਬਾਈਨ', 'কম্বাইন'],
  'zero till drill': ['zero till', 'जीरो टिल', 'ਜ਼ੀਰੋ ਟਿਲ', 'জিরো টিল'],
  'seed drill': ['seed drill', 'सीड ड्रिल', 'ਸੀਡ ਡ੍ਰਿਲ', 'সিড ড্রিল'],
  'thresher': ['thresher', 'थ्रेशर', 'ਥਰੈਸ਼ਰ', 'থ্রেশার'],
  'tractor': ['tractor', 'ट्रैक्टर', 'ਟਰੈਕਟਰ', 'ট্রাক্টর'],
};

interface Machine {
  id: string;
  name: string;
  status: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

function BookMachineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [acres, setAcres] = useState('');
  const [location, setLocation] = useState('');
  const [cropType, setCropType] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropData | null>(null);
  const [voiceLanguage, setVoiceLanguage] = useState<'hi-IN' | 'pa-IN' | 'en-IN' | 'bn-IN'>('hi-IN');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCropGuide, setShowCropGuide] = useState(false);
  const [cropSearchTerm, setCropSearchTerm] = useState('');
  const [voiceMode, setVoiceMode] = useState<'full' | 'field'>('full'); // full = fill all fields, field = one field
  const [currentVoiceField, setCurrentVoiceField] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<{
    crop: boolean;
    machine: boolean;
    name: boolean;
    phone: boolean;
    acres: boolean;
    location: boolean;
  }>({ crop: false, machine: false, name: false, phone: false, acres: false, location: false });
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptRef = useRef<string>('');

  useEffect(() => {
    fetchMachines();
    
    // Pre-select machine from query params
    const machineId = searchParams.get('machine');
    if (machineId) {
      setSelectedMachine(machineId);
    }

    // Check online status
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Initialize speech recognition
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'hi-IN'; // Hindi

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const speechResult = event.results[0][0].transcript.toLowerCase();
        setTranscript(speechResult);
        handleVoiceCommand(speechResult);
      };

      recognitionRef.current.onerror = (event: Event) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, [searchParams]);

  const fetchMachines = async () => {
    try {
      // Try to get user location for sorting
      let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/machines/available?limit=10`;
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          
          url += `&lat=${position.coords.latitude}&lng=${position.coords.longitude}`;
        } catch (err) {
          console.log('Location not available, showing all machines');
        }
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setMachines(data.machines || []);
    } catch (error) {
      console.error('Failed to fetch machines:', error);
    }
  };

  const handleVoiceCommand = (command: string) => {
    console.log('Voice command received:', command);
    const lowerCommand = command.toLowerCase();
    
    // Detect language from input
    const detectedLang = detectLanguage(command);
    console.log('Detected language:', detectedLang);
    if (detectedLang !== voiceLanguage) {
      setVoiceLanguage(detectedLang);
    }
    
    // If in single field mode, handle accordingly
    if (currentVoiceField) {
      handleSingleFieldVoice(command, currentVoiceField);
      return;
    }
    
    // Full form voice fill - extract all fields
    const extracted = extractAllFields(command);
    console.log('Extracted fields:', extracted);
    let filledFields: string[] = [];
    
    // Update extracted fields state
    const newExtractedFields = { ...extractedFields };
    
    // 1. Extract Crop Type and Auto-Select Machine
    if (extracted.crop) {
      setCropType(extracted.crop.id);
      setSelectedCrop(extracted.crop);
      newExtractedFields.crop = true;
      filledFields.push('फसल/Crop');
      
      // Auto-select the best available machine for this crop
      autoSelectMachineForCrop(extracted.crop);
      newExtractedFields.machine = true;
      filledFields.push('मशीन/Machine');
    }
    
    // 2. Machine is auto-selected based on crop - no manual selection needed
    
    // 3. Extract Name
    if (extracted.name) {
      setFarmerName(extracted.name);
      newExtractedFields.name = true;
      filledFields.push('नाम/Name');
    }
    
    // 4. Extract Phone
    if (extracted.phone) {
      setFarmerPhone(extracted.phone);
      newExtractedFields.phone = true;
      filledFields.push('फोन/Phone');
    }
    
    // 5. Extract Acres
    if (extracted.acres) {
      setAcres(extracted.acres.toString());
      newExtractedFields.acres = true;
      filledFields.push('एकड़/Acres');
    }
    
    // 6. Extract Location
    if (extracted.location) {
      setLocation(extracted.location);
      newExtractedFields.location = true;
      filledFields.push('गांव/Location');
    }
    
    setExtractedFields(newExtractedFields);
    
    // Provide voice feedback
    if (filledFields.length > 0) {
      const feedbackText = getFeedbackText(filledFields, newExtractedFields, detectedLang);
      speak(feedbackText, detectedLang);
    } else {
      // Handle specific commands
      if (lowerCommand.includes('book') || lowerCommand.includes('बुक') || lowerCommand.includes('ਬੁੱਕ') || lowerCommand.includes('বুক')) {
        if (selectedMachine && farmerName && farmerPhone && acres && location) {
          speak(getLocalizedText('booking', detectedLang), detectedLang);
          handleSubmit(new Event('submit') as any);
        } else {
          speak(getLocalizedText('fillAll', detectedLang), detectedLang);
        }
      } else if (lowerCommand.includes('help') || lowerCommand.includes('मदद') || lowerCommand.includes('ਮਦਦ') || lowerCommand.includes('সাহায্য')) {
        speak(getLocalizedText('help', detectedLang), detectedLang);
      } else if (lowerCommand.includes('clear') || lowerCommand.includes('reset') || lowerCommand.includes('साफ') || lowerCommand.includes('ਸਾਫ਼')) {
        clearForm();
        speak(getLocalizedText('cleared', detectedLang), detectedLang);
      } else {
        speak(getLocalizedText('notUnderstood', detectedLang), detectedLang);
      }
    }
  };

  // Extract all fields from voice input
  const extractAllFields = (text: string): {
    crop: CropData | null;
    machine: string | null;
    name: string | null;
    phone: string | null;
    acres: number | null;
    location: string | null;
  } => {
    const result = {
      crop: null as CropData | null,
      machine: null as string | null,
      name: null as string | null,
      phone: null as string | null,
      acres: null as number | null,
      location: null as string | null,
    };
    
    // 1. Extract Crop
    result.crop = findCropFromVoice(text);
    
    // 2. Extract Machine
    result.machine = extractMachine(text);
    
    // 3. Extract Name
    result.name = extractName(text);
    
    // 4. Extract Phone Number
    result.phone = extractPhone(text);
    
    // 5. Extract Land Area (Acres)
    result.acres = extractAcres(text);
    
    // 6. Extract Location/Village
    result.location = extractLocation(text);
    
    return result;
  };

  // Extract machine from text
  const extractMachine = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    
    for (const [machine, variations] of Object.entries(MACHINE_KEYWORDS)) {
      for (const variation of variations) {
        if (lowerText.includes(variation.toLowerCase()) || text.includes(variation)) {
          return machine;
        }
      }
    }
    return null;
  };

  // Extract name from text
  const extractName = (text: string): string | null => {
    // Pattern: "my name is X", "मेरा नाम X है", "আমার নাম X", etc.
    const patterns = [
      /(?:my name is|i am|i'm|name is)\s+([a-zA-Z\s]+?)(?:\s+(?:and|from|phone|village|acre|mobile|number|i live|,|\.)|$)/i,
      /(?:मेरा नाम|नाम)\s+([^\s]+(?:\s+[^\s]+)?)\s*(?:है|और|फोन|गांव|एकड़|मोबाइल|मैं|,|$)/i,
      /(?:ਮੇਰਾ ਨਾਮ|ਨਾਮ)\s+([^\s]+(?:\s+[^\s]+)?)\s*(?:ਹੈ|ਅਤੇ|ਫੋਨ|ਪਿੰਡ|,|$)/i,
      // Bengali: আমার নাম X - captures name until punctuation or next sentence
      /আমার\s+নাম\s+([\u0980-\u09FF\s]+?)(?:\s*[।\.\|]|\s+আমি|\s+আমার|$)/i,
      /নাম\s+([\u0980-\u09FF]+(?:\s+[\u0980-\u09FF]+)?)\s*(?:।|\.|আমি|$)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim().replace(/[।\.]/g, '');
        // Validate it looks like a name (not a number or common word)
        if (name.length > 1 && !/^\d+$/.test(name) && !isCommonWord(name)) {
          return capitalizeWords(name);
        }
      }
    }
    return null;
  };

  // Extract phone number from text
  const extractPhone = (text: string): string | null => {
    // Remove spaces and common separators
    const cleanText = text.replace(/[\s-]/g, '');
    
    // Look for 10-digit number
    const phoneMatch = cleanText.match(/(\d{10})/);
    if (phoneMatch) {
      return phoneMatch[1];
    }
    
    // Try to extract digits that might be spoken separately
    const digits = text.match(/\d/g);
    if (digits && digits.length >= 10) {
      return digits.slice(0, 10).join('');
    }
    
    return null;
  };

  // Extract acres from text
  const extractAcres = (text: string): number | null => {
    const lowerText = text.toLowerCase();
    
    // Pattern for numbers followed by acre keywords
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:acre|acres|एकड़|बीघा|ਏਕੜ|একর|বিঘা|বিঘে)/i,
      /(?:acre|acres|एकड़|बीघा|ਏਕੜ|একর|বিঘা|বিঘে)\s*(?:is|है|ਹੈ|আছে)?\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*(?:land|जमीन|ਜ਼ਮੀਨ|জমি)/i,
      // Bengali: পাঁচ বিঘে জমি আছে (5 bigha land)
      /([\u0980-\u09FF]+)\s*(?:বিঘা|বিঘে|একর)\s*(?:জমি)?\s*(?:আছে)?/i,
      /(?:জমি|ক্ষেত)\s*(?:আছে)?\s*(\d+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numStr = match[1] || match[2];
        // Check if it's a Bengali number word
        if (numStr && NUMBER_WORDS[numStr]) {
          return NUMBER_WORDS[numStr];
        }
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0 && num < 10000) {
          return num;
        }
      }
    }
    
    // Check for number words in context of land
    const landContext = [...LAND_KEYWORDS.english, ...LAND_KEYWORDS.hindi, ...LAND_KEYWORDS.punjabi, ...LAND_KEYWORDS.bengali];
    const hasLandContext = landContext.some(kw => lowerText.includes(kw.toLowerCase()) || text.includes(kw));
    
    if (hasLandContext) {
      for (const [word, value] of Object.entries(NUMBER_WORDS)) {
        if (text.includes(word)) {
          return value;
        }
      }
    }
    
    return null;
  };

  // Extract location/village from text
  const extractLocation = (text: string): string | null => {
    // Patterns for location extraction
    const patterns = [
      /(?:village|from|at|location|place|live in|living in)\s+(?:is\s+)?([a-zA-Z\s]+?)(?:\s+(?:and|phone|acre|mobile|i have|,|\.)|$)/i,
      /(?:गांव|गाँव|जगह|से|में रहता|में रहती)\s+([^\s]+(?:\s+[^\s]+)?)\s*(?:है|हूं|और|फोन|एकड़|,|$)/i,
      /(?:ਪਿੰਡ|ਥਾਂ|ਤੋਂ|ਵਿੱਚ ਰਹਿੰਦਾ)\s+([^\s]+(?:\s+[^\s]+)?)\s*(?:ਹੈ|ਅਤੇ|ਫੋਨ|,|$)/i,
      // Bengali: আমি নবগ্রামে থাকি (I live in Nabagram) - থাকি means "live"
      /আমি\s+([\u0980-\u09FF]+?)(?:তে|য়|মে|এ)?\s+থাকি/i,
      /([\u0980-\u09FF]+?)(?:তে|য়|মে|এ)\s+থাকি/i,
      /(?:গ্রাম|এলাকা|জায়গা)\s+([\u0980-\u09FF]+)/i,
      // Also try to extract location suffix patterns like "নবগ্রামে" -> "নবগ্রাম"
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let loc = match[1].trim();
        // Remove Bengali locative suffixes (ে, ত, য়, মে)
        loc = loc.replace(/[েতয়]$/, '');
        loc = loc.replace(/মে$/, 'ম');
        if (loc.length > 1 && !/^\d+$/.test(loc)) {
          return capitalizeWords(loc);
        }
      }
    }
    return null;
  };

  // Handle single field voice input
  const handleSingleFieldVoice = (text: string, field: string) => {
    const detectedLang = detectLanguage(text);
    
    switch (field) {
      case 'name':
        const name = extractName(text) || capitalizeWords(text.trim());
        if (name && name.length > 1) {
          setFarmerName(name);
          setExtractedFields(prev => ({ ...prev, name: true }));
          speak(`नाम ${name} भरा गया। Name set to ${name}.`, detectedLang);
        }
        break;
      case 'phone':
        const phone = extractPhone(text);
        if (phone) {
          setFarmerPhone(phone);
          setExtractedFields(prev => ({ ...prev, phone: true }));
          speak(`फोन नंबर ${phone} भरा गया।`, detectedLang);
        } else {
          speak('कृपया 10 अंकों का फोन नंबर बोलें। Please say 10 digit phone number.', detectedLang);
        }
        break;
      case 'acres':
        const acresVal = extractAcres(text) || parseFloat(text.replace(/[^\d.]/g, ''));
        if (acresVal && !isNaN(acresVal)) {
          setAcres(acresVal.toString());
          setExtractedFields(prev => ({ ...prev, acres: true }));
          speak(`${acresVal} एकड़ भरा गया। ${acresVal} acres set.`, detectedLang);
        }
        break;
      case 'location':
        const loc = extractLocation(text) || capitalizeWords(text.trim());
        if (loc && loc.length > 1) {
          setLocation(loc);
          setExtractedFields(prev => ({ ...prev, location: true }));
          speak(`गांव ${loc} भरा गया। Location set to ${loc}.`, detectedLang);
        }
        break;
    }
    setCurrentVoiceField(null);
  };

  // Helper functions
  const capitalizeWords = (str: string): string => {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  };

  const isCommonWord = (word: string): boolean => {
    const commonWords = ['is', 'am', 'are', 'the', 'and', 'or', 'my', 'i', 'me', 'है', 'हूं', 'मैं', 'और'];
    return commonWords.includes(word.toLowerCase());
  };

  const clearForm = () => {
    setFarmerName('');
    setFarmerPhone('');
    setAcres('');
    setLocation('');
    setCropType('');
    setSelectedCrop(null);
    setSelectedMachine('');
    setExtractedFields({ crop: false, machine: false, name: false, phone: false, acres: false, location: false });
  };

  const getLocalizedText = (key: string, lang: string): string => {
    const texts: { [key: string]: { [lang: string]: string } } = {
      booking: {
        'hi-IN': 'बुकिंग हो रही है। कृपया प्रतीक्षा करें।',
        'en-IN': 'Processing your booking. Please wait.',
        'pa-IN': 'ਬੁਕਿੰਗ ਹੋ ਰਹੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ।',
        'bn-IN': 'বুকিং হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।',
      },
      fillAll: {
        'hi-IN': 'कृपया सभी जानकारी भरें।',
        'en-IN': 'Please fill all required fields.',
        'pa-IN': 'ਕਿਰਪਾ ਕਰਕੇ ਸਾਰੀ ਜਾਣਕਾਰੀ ਭਰੋ।',
        'bn-IN': 'অনুগ্রহ করে সমস্ত তথ্য পূরণ করুন।',
      },
      help: {
        'hi-IN': 'बोलें: मेरा नाम राम है, गांव सिरसा, 5 एकड़ जमीन, धान की फसल, फोन 9876543210',
        'en-IN': 'Say: My name is Ram, village Sirsa, 5 acres land, rice crop, phone 9876543210',
        'pa-IN': 'ਬੋਲੋ: ਮੇਰਾ ਨਾਮ ਰਾਮ ਹੈ, ਪਿੰਡ ਸਿਰਸਾ, 5 ਏਕੜ ਜ਼ਮੀਨ, ਝੋਨਾ',
        'bn-IN': 'বলুন: আমার নাম রাম, গ্রাম সিরসা, 5 একর জমি, ধান',
      },
      cleared: {
        'hi-IN': 'फॉर्म साफ हो गया।',
        'en-IN': 'Form cleared.',
        'pa-IN': 'ਫਾਰਮ ਸਾਫ਼ ਹੋ ਗਿਆ।',
        'bn-IN': 'ফর্ম পরিষ্কার হয়ে গেছে।',
      },
      notUnderstood: {
        'hi-IN': 'मुझे समझ नहीं आया। कृपया फिर से बोलें।',
        'en-IN': 'I did not understand. Please try again.',
        'pa-IN': 'ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।',
        'bn-IN': 'আমি বুঝতে পারিনি। অনুগ্রহ করে আবার বলুন।',
      },
    };
    return texts[key]?.[lang] || texts[key]?.['en-IN'] || '';
  };

  const getFeedbackText = (filledFields: string[], extracted: typeof extractedFields, lang: string): string => {
    const count = filledFields.length;
    const remaining = Object.values(extracted).filter(v => !v).length;
    
    if (lang === 'hi-IN') {
      return `${count} जानकारी भरी गई: ${filledFields.join(', ')}। ${remaining > 0 ? `${remaining} और भरें।` : 'सभी भर गया! बुक बोलें।'}`;
    } else if (lang === 'bn-IN') {
      return `${count}টি তথ্য পূরণ হয়েছে। ${remaining > 0 ? `আরও ${remaining}টি বাকি।` : 'সব হয়ে গেছে! বুক বলুন।'}`;
    } else if (lang === 'pa-IN') {
      return `${count} ਜਾਣਕਾਰੀ ਭਰੀ ਗਈ। ${remaining > 0 ? `${remaining} ਹੋਰ ਭਰੋ।` : 'ਸਭ ਹੋ ਗਿਆ! ਬੁੱਕ ਬੋਲੋ।'}`;
    }
    return `Filled ${count} fields: ${filledFields.join(', ')}. ${remaining > 0 ? `${remaining} more to fill.` : 'All done! Say Book.'}`;
  };

  // Detect language from text
  const detectLanguage = (text: string): 'hi-IN' | 'pa-IN' | 'en-IN' | 'bn-IN' => {
    const hindiPattern = /[\u0900-\u097F]/;
    const punjabiPattern = /[\u0A00-\u0A7F]/;
    const bengaliPattern = /[\u0980-\u09FF]/;
    
    if (bengaliPattern.test(text)) return 'bn-IN';
    if (punjabiPattern.test(text)) return 'pa-IN';
    if (hindiPattern.test(text)) return 'hi-IN';
    return 'en-IN';
  };

  // Find crop from voice input using the lookup map
  const findCropFromVoice = (text: string): CropData | null => {
    const lowerText = text.toLowerCase();
    
    // Check each word in the text against the lookup
    const words = text.split(/\s+/);
    for (const word of words) {
      // Remove punctuation
      const cleanWord = word.replace(/[।.,!?]/g, '');
      const crop = CROP_LOOKUP[cleanWord.toLowerCase()] || CROP_LOOKUP[cleanWord];
      if (crop) return crop;
    }
    
    // Also check for partial matches
    for (const [key, crop] of Object.entries(CROP_LOOKUP)) {
      if (lowerText.includes(key.toLowerCase()) || text.includes(key)) {
        return crop;
      }
    }
    
    // Bengali cultivation patterns: "ধান চাষ করি" = I cultivate rice
    const bengaliCropPatterns = [
      /([ধগভআতসমচপটবজড][^\s]*)\s*চাষ/,  // X চাষ (X cultivation)
      /চাষ\s+করি\s*([^\s।]+)/,  // চাষ করি X
    ];
    
    for (const pattern of bengaliCropPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const crop = CROP_LOOKUP[match[1]];
        if (crop) return crop;
      }
    }
    
    return null;
  };

  // Filter crops based on search term
  const filteredCrops = cropMachinesData.crops.filter((crop: CropData) => {
    const search = cropSearchTerm.toLowerCase();
    return (
      crop.names.en.toLowerCase().includes(search) ||
      crop.names.hi.includes(cropSearchTerm) ||
      crop.names.pa.includes(cropSearchTerm) ||
      crop.aliases.some(alias => alias.toLowerCase().includes(search)) ||
      crop.machines.some(machine => machine.toLowerCase().includes(search))
    );
  });

  // Auto-select the best available machine for a crop
  const autoSelectMachineForCrop = (crop: CropData) => {
    if (machines.length === 0) {
      // If no machines loaded yet, just select the first one when available
      console.log('No machines available yet, will select when loaded');
      return;
    }
    
    // Try to find a machine that matches the recommended machines for this crop
    for (const recommendedMachine of crop.machines) {
      const matchedMachine = machines.find(m => 
        m.name?.toLowerCase().includes(recommendedMachine.toLowerCase()) ||
        m.id.toLowerCase().includes(recommendedMachine.toLowerCase())
      );
      if (matchedMachine) {
        setSelectedMachine(matchedMachine.id);
        console.log(`Auto-selected machine: ${matchedMachine.name || matchedMachine.id} for crop: ${crop.names.en}`);
        return;
      }
    }
    
    // If no exact match, select the first available (idle) machine
    const availableMachine = machines.find(m => m.status === 'idle' || m.status === 'available') || machines[0];
    if (availableMachine) {
      setSelectedMachine(availableMachine.id);
      console.log(`Auto-selected first available machine: ${availableMachine.name || availableMachine.id}`);
    }
  };

  // Text-to-Speech function
  const speak = (text: string, lang: string = 'hi-IN') => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = (fieldMode?: string) => {
    if (isListening) {
      recognitionRef.current?.stop();
      setCurrentVoiceField(null);
    } else {
      setTranscript('');
      setCurrentVoiceField(fieldMode || null);
      
      // Re-initialize with current language
      if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Keep listening for longer input
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = voiceLanguage;

        transcriptRef.current = ''; // Reset transcript ref
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let fullTranscript = '';
          let interimTranscript = '';
          
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              fullTranscript += result + ' ';
            } else {
              interimTranscript = result;
            }
          }
          
          transcriptRef.current = fullTranscript; // Store in ref for access
          setTranscript(fullTranscript + interimTranscript);
        };

        recognitionRef.current.onerror = (event: Event) => {
          console.error('Speech recognition error:', event);
          setIsListening(false);
          setCurrentVoiceField(null);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          setCurrentVoiceField(null);
        };
      }
      
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        
        // Give audio feedback based on mode
        if (fieldMode) {
          const fieldPrompts: { [key: string]: string } = {
            name: 'अपना नाम बोलें। Say your name.',
            phone: 'अपना फोन नंबर बोलें। Say your phone number.',
            acres: 'कितने एकड़ जमीन है? How many acres?',
            location: 'अपना गांव बोलें। Say your village name.',
          };
          speak(fieldPrompts[fieldMode] || 'बोलिए...', voiceLanguage);
        } else {
          speak('बोलिए - नाम, फोन, गांव, एकड़ और फसल सब बताएं। Tell me your name, phone, village, acres and crop.', voiceLanguage);
        }
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setIsListening(false);
        setCurrentVoiceField(null);
      }
    }
  };

  // Stop listening and process
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      // Process the current transcript from ref
      const currentTranscript = transcriptRef.current.trim();
      if (currentTranscript) {
        console.log('Processing voice input:', currentTranscript);
        handleVoiceCommand(currentTranscript);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const bookingData = {
      machine_id: selectedMachine,
      farmer_name: farmerName,
      farmer_phone: farmerPhone,
      acres: parseFloat(acres),
      location: location,
      timestamp: Date.now(),
      status: 'pending'
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to receipt page
        router.push(`/farmer/receipt/${data.booking.id}`);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Booking failed:', error);
      
      // Save to localStorage for offline sync
      if (!isOnline) {
        const offlineBookings = JSON.parse(localStorage.getItem('offline_bookings') || '[]');
        const offlineBooking = {
          ...bookingData,
          id: `offline_${Date.now()}`,
          offline: true
        };
        offlineBookings.push(offlineBooking);
        localStorage.setItem('offline_bookings', JSON.stringify(offlineBookings));
        
        alert('📵 No internet! Booking saved offline. Will sync when online.');
        router.push(`/farmer/receipt/${offlineBooking.id}`);
      } else {
        alert('Booking failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="hover:bg-green-700 p-2 rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Book Machine | मशीन बुक करें</h1>
        </div>
      </div>

      {/* Online Status */}
      <div className={`py-2 text-center text-sm ${isOnline ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
        {isOnline ? (
          <span className="flex items-center justify-center gap-2">
            <Wifi size={16} /> Online
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <WifiOff size={16} /> Offline - Bookings will sync when online
          </span>
        )}
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
          
          {/* Voice Assistant - Enhanced */}
          <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border-2 border-blue-300 rounded-xl p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-800">
                  <Mic className="text-blue-600" size={22} />
                  Voice Form Fill | आवाज से फॉर्म भरें
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  🗣️ Speak in Hindi, English, Punjabi, or Bengali | हिंदी, अंग्रेज़ी, पंजाबी या बंगाली में बोलें
                </p>
              </div>
              <select
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value as 'hi-IN' | 'pa-IN' | 'en-IN' | 'bn-IN')}
                className="text-sm border-2 border-blue-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="hi-IN">🇮🇳 हिंदी</option>
                <option value="pa-IN">🇮🇳 ਪੰਜਾਬੀ</option>
                <option value="en-IN">🇬🇧 English</option>
                <option value="bn-IN">🇮🇳 বাংলা</option>
              </select>
            </div>

            {/* Main Voice Button */}
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={() => toggleListening()}
                className={`p-6 rounded-full transition-all transform hover:scale-105 ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-xl shadow-red-300' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg'
                } text-white`}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
            </div>
            
            {isListening ? (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  <span className="font-bold text-red-700">🎤 Listening... बोलते रहें...</span>
                </div>
                <p className="text-sm text-red-600">
                  {currentVoiceField 
                    ? `Recording: ${currentVoiceField}` 
                    : 'बोलें: "मेरा नाम राम, गांव सिरसा, 5 एकड़, धान, फोन 9876543210"'}
                </p>
                <button
                  type="button"
                  onClick={stopListening}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  ✓ Done Speaking | बोलना हो गया
                </button>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-600">
                👆 Click mic & say all details in one sentence | माइक दबाएं और सब कुछ एक साथ बोलें
              </p>
            )}

            {transcript && (
              <div className="bg-white border-2 border-blue-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-gray-500 mb-1">🗣️ You said:</p>
                <p className="text-sm font-medium text-gray-800">{transcript}</p>
                {!isListening && (
                  <button
                    type="button"
                    onClick={() => handleVoiceCommand(transcript)}
                    className="mt-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    ✨ Process & Fill Form | फॉर्म भरें
                  </button>
                )}
              </div>
            )}

            {/* Show what was detected */}
            {(farmerName || location || acres || cropType) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-green-700 font-medium mb-2">✅ Detected / पाया गया:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {farmerName && <p>👤 {farmerName}</p>}
                  {location && <p>📍 {location}</p>}
                  {acres && <p>📐 {acres} acres/एकड़</p>}
                  {cropType && <p>🌾 {cropType}</p>}
                  {farmerPhone && <p>📱 {farmerPhone}</p>}
                </div>
              </div>
            )}

            {/* Field Status Indicators */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { key: 'crop', label: 'फसल/Crop', icon: '🌾' },
                { key: 'machine', label: 'मशीन', icon: '🚜' },
                { key: 'name', label: 'नाम/Name', icon: '👤' },
                { key: 'phone', label: 'फोन', icon: '📱' },
                { key: 'acres', label: 'एकड़', icon: '📐' },
                { key: 'location', label: 'गांव', icon: '📍' },
              ].map(({ key, label, icon }) => (
                <div 
                  key={key}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                    extractedFields[key as keyof typeof extractedFields]
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}
                >
                  {extractedFields[key as keyof typeof extractedFields] 
                    ? <CheckCircle size={14} className="text-green-600" />
                    : <Circle size={14} />
                  }
                  <span>{icon} {label}</span>
                </div>
              ))}
            </div>

            {/* Individual Field Voice Buttons */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-gray-600 mb-2">Or fill one field at a time | एक-एक करके भरें:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { field: 'name', label: '👤 Name/नाम', hint: 'Say your name' },
                  { field: 'phone', label: '📱 Phone/फोन', hint: 'Say 10 digits' },
                  { field: 'acres', label: '📐 Acres/एकड़', hint: 'Say number' },
                  { field: 'location', label: '📍 Village/गांव', hint: 'Say location' },
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => toggleListening(field)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 ${
                      currentVoiceField === field
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <Mic size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick crop buttons */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-gray-600 mb-2">Quick select crop | फसल चुनें:</p>
              <div className="flex flex-wrap gap-2">
                {cropMachinesData.crops.slice(0, 8).map((crop: CropData) => (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => {
                      setCropType(crop.id);
                      setSelectedCrop(crop);
                      autoSelectMachineForCrop(crop);
                      setExtractedFields(prev => ({ ...prev, crop: true, machine: true }));
                      speak(`${crop.names.hi} चुना गया। ${crop.machines[0]} मशीन आपके लिए चुनी गई।`, voiceLanguage);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-1 ${
                      cropType === crop.id
                        ? 'bg-green-500 text-white border-green-600'
                        : 'bg-green-50 text-green-800 border-green-300 hover:bg-green-100'
                    }`}
                  >
                    <span>{crop.icon}</span>
                    <span>{crop.names.hi}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Machine Recommendation */}
          {selectedCrop && (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="bg-green-500 text-white p-2 rounded-full text-2xl">
                  {selectedCrop.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-800 text-lg">
                    {selectedCrop.names.en} | {selectedCrop.names.hi}
                  </h3>
                  <p className="text-xs text-green-600 mb-2">Season: {selectedCrop.season}</p>
                  
                  <div className="bg-white rounded-lg p-3 mb-2">
                    <p className="text-sm font-semibold text-gray-700 mb-2">🚜 Recommended Machines:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCrop.machines.map((machine, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {machine}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-sm text-green-700">{selectedCrop.description.en}</p>
                  <p className="text-sm text-green-600">{selectedCrop.description.hi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => speak(`${selectedCrop.names.hi} के लिए ${selectedCrop.machines.join(', ')} का उपयोग करें। ${selectedCrop.description.hi}`, 'hi-IN')}
                  className="p-2 bg-green-200 hover:bg-green-300 rounded-full"
                >
                  <Volume2 size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Crop & Machine Guide - Expandable */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCropGuide(!showCropGuide)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-green-50 hover:from-amber-100 hover:to-green-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Leaf className="text-green-600" size={20} />
                <span className="font-semibold text-gray-700">Crop & Machine Guide | फसल-मशीन गाइड</span>
                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">{cropMachinesData.crops.length} crops</span>
              </div>
              {showCropGuide ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {showCropGuide && (
              <div className="p-4 bg-white max-h-96 overflow-y-auto">
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={cropSearchTerm}
                    onChange={(e) => setCropSearchTerm(e.target.value)}
                    placeholder="Search crops or machines..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                  />
                </div>
                
                {/* Crop Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCrops.map((crop: CropData) => (
                    <div
                      key={crop.id}
                      onClick={() => {
                        setCropType(crop.id);
                        setSelectedCrop(crop);
                        autoSelectMachineForCrop(crop);
                        setExtractedFields(prev => ({ ...prev, crop: true, machine: true }));
                        setShowCropGuide(false);
                        speak(`${crop.names.hi} चुना गया। मशीन अपने आप चुनी गई।`, 'hi-IN');
                      }}
                      className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedCrop?.id === crop.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">{crop.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">
                            {crop.names.en} | {crop.names.hi}
                          </h4>
                          <p className="text-xs text-gray-500">{crop.season}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {crop.machines.slice(0, 2).map((machine, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {machine}
                              </span>
                            ))}
                            {crop.machines.length > 2 && (
                              <span className="text-xs text-gray-400">+{crop.machines.length - 2}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredCrops.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No crops found matching "{cropSearchTerm}"</p>
                )}
              </div>
            )}
          </div>

          {/* Crop Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Leaf className="inline mr-1" size={16} />
              Crop Type | फसल का प्रकार <span className="text-red-500">*</span>
            </label>
            <select
              value={cropType}
              onChange={(e) => {
                const crop = cropMachinesData.crops.find((c: CropData) => c.id === e.target.value);
                setCropType(e.target.value);
                if (crop) {
                  setSelectedCrop(crop);
                  autoSelectMachineForCrop(crop);
                  setExtractedFields(prev => ({ ...prev, crop: true, machine: true }));
                  speak(`${crop.names.hi} चुना गया। ${crop.machines[0]} मशीन आपके लिए चुनी गई है।`, 'hi-IN');
                }
              }}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- Select Crop / फसल चुनें --</option>
              {cropMachinesData.crops.map((crop: CropData) => (
                <option key={crop.id} value={crop.id}>
                  {crop.icon} {crop.names.hi} / {crop.names.en} ({crop.season})
                </option>
              ))}
            </select>
          </div>

          {/* Auto-Selected Machine Display (based on crop) */}
          {selectedMachine && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tractor className="text-blue-600" size={20} />
                <span className="font-semibold text-blue-800">Auto-Selected Machine | चुनी गई मशीन</span>
                <CheckCircle className="text-green-500" size={16} />
              </div>
              <div className="bg-white rounded-lg p-3">
                {(() => {
                  const machine = machines.find(m => m.id === selectedMachine);
                  if (machine) {
                    return (
                      <div>
                        <p className="font-bold text-gray-800">{machine.name || machine.id}</p>
                        <p className="text-sm text-gray-600">
                          Status: <span className={`font-medium ${machine.status === 'idle' || machine.status === 'available' ? 'text-green-600' : 'text-blue-600'}`}>
                            {machine.status || 'Available'}
                          </span>
                        </p>
                        {selectedCrop && (
                          <p className="text-xs text-blue-600 mt-1">
                            ✓ Best machine for {selectedCrop.names.hi} ({selectedCrop.names.en})
                          </p>
                        )}
                      </div>
                    );
                  }
                  return <p className="text-gray-500">Machine selected</p>;
                })()}
              </div>
            </div>
          )}

          {!selectedMachine && selectedCrop && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
              ⏳ Selecting best machine for {selectedCrop.names.hi}...
            </div>
          )}

          {!selectedCrop && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
              👆 Select a crop above or use voice to automatically select the best machine | फसल चुनें, मशीन अपने आप चुन ली जाएगी
            </div>
          )}

          {/* Farmer Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Name | आपका नाम <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={farmerName}
              onChange={(e) => setFarmerName(e.target.value)}
              required
              placeholder="Enter your name"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number | फोन नंबर <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={farmerPhone}
              onChange={(e) => setFarmerPhone(e.target.value)}
              required
              placeholder="10-digit mobile number"
              pattern="[0-9]{10}"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Acres */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Land Area (Acres) | जमीन (एकड़) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={acres}
              onChange={(e) => setAcres(e.target.value)}
              required
              step="0.1"
              min="0.1"
              placeholder="e.g., 5.5"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Village / Location | गांव <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="Enter village or location"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-lg transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Booking...' : '📝 Confirm Booking | बुकिंग करें'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BookMachine() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <BookMachineContent />
    </Suspense>
  );
}
