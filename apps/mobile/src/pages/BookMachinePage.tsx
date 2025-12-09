import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Volume2, ChevronDown, ChevronUp, Search, Leaf, AlertCircle } from 'lucide-react'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { createBooking } from '../lib/api'
import cropMachinesData from '../data/crop-machines.json'
import './BookMachinePage.css'

interface CropData {
  id: string
  names: { en: string; hi: string; pa: string }
  aliases: string[]
  season: string
  machines: string[]
  icon: string
  description: { en: string; hi: string }
}

// Build crop lookup for voice recognition
const buildCropLookup = () => {
  const lookup: { [key: string]: CropData } = {}
  cropMachinesData.crops.forEach((crop: CropData) => {
    lookup[crop.names.en.toLowerCase()] = crop
    lookup[crop.names.hi] = crop
    lookup[crop.names.pa] = crop
    crop.aliases.forEach(alias => {
      lookup[alias.toLowerCase()] = crop
    })
  })
  return lookup
}

const CROP_LOOKUP = buildCropLookup()

// Number words for parsing
const NUMBER_WORDS: { [key: string]: number } = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'fifteen': 15, 'twenty': 20, 'twenty five': 25, 'thirty': 30,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'पंद्रह': 15, 'बीस': 20, 'पच्चीस': 25, 'तीस': 30,
  'আধা': 0.5, 'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5,
  'ছয়': 6, 'সাত': 7, 'আট': 8, 'নয়': 9, 'দশ': 10,
  'পনের': 15, 'কুড়ি': 20, 'পঁচিশ': 25, 'ত্রিশ': 30,
}

export default function BookMachinePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { machines } = useSocket()

  const [selectedMachine, setSelectedMachine] = useState(searchParams.get('machine') || '')
  const [farmerName, setFarmerName] = useState(user?.name || '')
  const [farmerPhone, setFarmerPhone] = useState(user?.phone || '')
  const [acres, setAcres] = useState('')
  const [location, setLocation] = useState(user?.village || '')
  const [cropType, setCropType] = useState('')
  const [selectedCrop, setSelectedCrop] = useState<CropData | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCropGuide, setShowCropGuide] = useState(false)
  const [cropSearchTerm, setCropSearchTerm] = useState('')
  const [voiceLanguage, setVoiceLanguage] = useState<'hi-IN' | 'en-IN' | 'bn-IN'>('hi-IN')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(true)

  // Check permissions on mount
  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      const { speechRecognition } = await SpeechRecognition.checkPermissions()
      if (speechRecognition === 'denied') {
        setVoiceError('Microphone permission denied')
        setVoiceSupported(false)
      }
    } catch (error) {
      console.log('Permission check error:', error)
    }
  }

  // Filter crops based on search
  const filteredCrops = cropMachinesData.crops.filter((crop: CropData) => {
    const search = cropSearchTerm.toLowerCase()
    return (
      crop.names.en.toLowerCase().includes(search) ||
      crop.names.hi.includes(cropSearchTerm) ||
      crop.aliases.some(alias => alias.toLowerCase().includes(search))
    )
  })

  // Get available machines from socket
  const availableMachines = Array.from(machines.values()).filter(m => 
    m.state === 'idle' || m.state === 'active'
  )

  // Auto-select machine based on crop
  const autoSelectMachineForCrop = (crop: CropData) => {
    if (availableMachines.length === 0) return
    
    for (const recommendedMachine of crop.machines) {
      const matched = availableMachines.find(m => 
        m.id.toLowerCase().includes(recommendedMachine.toLowerCase()) ||
        m.type?.toLowerCase().includes(recommendedMachine.toLowerCase())
      )
      if (matched) {
        setSelectedMachine(matched.id)
        return
      }
    }
    if (availableMachines[0]) {
      setSelectedMachine(availableMachines[0].id)
    }
  }

  // Text-to-Speech
  const speak = (text: string, lang: string = 'hi-IN') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.9
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  // Detect language from text
  const detectLanguage = (text: string): 'hi-IN' | 'en-IN' | 'bn-IN' => {
    if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'
    return 'en-IN'
  }

  // Find crop from voice input
  const findCropFromVoice = (text: string): CropData | null => {
    const lowerText = text.toLowerCase()
    
    // Check each word
    const words = text.split(/\s+/)
    for (const word of words) {
      const cleanWord = word.replace(/[।.,!?]/g, '')
      const crop = CROP_LOOKUP[cleanWord.toLowerCase()] || CROP_LOOKUP[cleanWord]
      if (crop) return crop
    }
    
    // Check partial matches
    for (const [key, crop] of Object.entries(CROP_LOOKUP)) {
      if (lowerText.includes(key.toLowerCase()) || text.includes(key)) {
        return crop
      }
    }
    return null
  }

  // Extract acres from text
  const extractAcres = (text: string): number | null => {
    // Pattern for numbers followed by acre keywords
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:acre|acres|एकड़|बीघा|একর|বিঘা|বিঘে)/i,
      /(?:acre|acres|एकड़|बीघा|একর|বিঘা)\s*(?:is|है|আছে)?\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*(?:land|जमीन|জমি)/i,
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const num = parseFloat(match[1] || match[2])
        if (!isNaN(num) && num > 0 && num < 10000) return num
      }
    }
    
    // Check for number words
    for (const [word, value] of Object.entries(NUMBER_WORDS)) {
      if (text.toLowerCase().includes(word) || text.includes(word)) {
        return value
      }
    }
    
    // Try to find any number
    const numMatch = text.match(/(\d+)/)
    if (numMatch) {
      const num = parseInt(numMatch[1])
      if (num > 0 && num < 1000) return num
    }
    
    return null
  }

  // Extract location from text
  const extractLocation = (text: string): string | null => {
    const patterns = [
      /(?:village|from|at|location|गांव|गाँव|से|में|গ্রাম|থেকে)\s+(?:is\s+)?([a-zA-Z\u0900-\u097F\u0980-\u09FF]+)/i,
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const loc = match[1].trim()
        if (loc.length > 1 && !/^\d+$/.test(loc)) {
          return loc.charAt(0).toUpperCase() + loc.slice(1)
        }
      }
    }
    return null
  }

  // Extract name from text
  const extractName = (text: string): string | null => {
    const patterns = [
      /(?:my name is|i am|name is|मेरा नाम|नाम|আমার নাম)\s+([a-zA-Z\u0900-\u097F\u0980-\u09FF]+(?:\s+[a-zA-Z\u0900-\u097F\u0980-\u09FF]+)?)/i,
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const name = match[1].trim()
        if (name.length > 1) {
          return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        }
      }
    }
    return null
  }

  // Extract phone from text
  const extractPhone = (text: string): string | null => {
    const cleanText = text.replace(/[\s-]/g, '')
    const phoneMatch = cleanText.match(/(\d{10})/)
    if (phoneMatch) return phoneMatch[1]
    
    const digits = text.match(/\d/g)
    if (digits && digits.length >= 10) {
      return digits.slice(0, 10).join('')
    }
    return null
  }

  // Handle voice command - process the transcript
  const handleVoiceCommand = (command: string) => {
    console.log('Processing voice command:', command)
    setVoiceError('')
    
    const detectedLang = detectLanguage(command)
    let filledFields: string[] = []
    
    // Extract crop
    const crop = findCropFromVoice(command)
    if (crop) {
      setCropType(crop.id)
      setSelectedCrop(crop)
      autoSelectMachineForCrop(crop)
      filledFields.push('फसल/Crop')
    }
    
    // Extract name
    const name = extractName(command)
    if (name && !farmerName) {
      setFarmerName(name)
      filledFields.push('नाम/Name')
    }
    
    // Extract phone
    const phone = extractPhone(command)
    if (phone && !farmerPhone) {
      setFarmerPhone(phone)
      filledFields.push('फोन/Phone')
    }
    
    // Extract acres
    const acresVal = extractAcres(command)
    if (acresVal) {
      setAcres(acresVal.toString())
      filledFields.push('एकड़/Acres')
    }
    
    // Extract location
    const loc = extractLocation(command)
    if (loc) {
      setLocation(loc)
      filledFields.push('गांव/Location')
    }
    
    // Provide feedback
    if (filledFields.length > 0) {
      const feedback = detectedLang === 'hi-IN' 
        ? `${filledFields.length} जानकारी भरी गई: ${filledFields.join(', ')}`
        : detectedLang === 'bn-IN'
        ? `${filledFields.length}টি তথ্য পূরণ হয়েছে`
        : `Filled ${filledFields.length} fields: ${filledFields.join(', ')}`
      speak(feedback, detectedLang)
    } else {
      const msg = detectedLang === 'hi-IN' 
        ? 'कुछ समझ नहीं आया। कृपया फसल का नाम, एकड़ और गांव बोलें।' 
        : detectedLang === 'bn-IN'
        ? 'বুঝতে পারিনি। অনুগ্রহ করে ফসলের নাম, বিঘা এবং গ্রাম বলুন।'
        : 'Could not understand. Please say crop name, acres and village.'
      speak(msg, detectedLang)
    }
  }

  // Start native speech recognition
  const startListening = async () => {
    setVoiceError('')
    setTranscript('')
    
    try {
      // Request permission first
      const permResult = await SpeechRecognition.requestPermissions()
      if (permResult.speechRecognition !== 'granted') {
        setVoiceError('Microphone permission denied. Please allow in settings.')
        return
      }

      // Check if available
      const available = await SpeechRecognition.available()
      if (!available.available) {
        setVoiceError('Speech recognition not available on this device')
        return
      }

      setIsListening(true)
      
      // Speak instruction
      speak(
        voiceLanguage === 'hi-IN' 
          ? 'बोलिए - फसल का नाम, कितने एकड़, और गांव का नाम' 
          : voiceLanguage === 'bn-IN'
          ? 'বলুন - ফসলের নাম, কত বিঘা, এবং গ্রামের নাম'
          : 'Say - crop name, how many acres, and village name',
        voiceLanguage
      )

      // Start listening with native plugin
      const result = await SpeechRecognition.start({
        language: voiceLanguage,
        maxResults: 5,
        prompt: voiceLanguage === 'hi-IN' ? 'बोलिए...' : 'Speak now...',
        partialResults: true,
        popup: true, // Show native popup on Android
      })

      console.log('Speech result:', result)
      
      if (result.matches && result.matches.length > 0) {
        const bestMatch = result.matches[0]
        setTranscript(bestMatch)
        handleVoiceCommand(bestMatch)
      } else {
        setVoiceError('No speech detected. Please try again.')
      }
      
    } catch (error: any) {
      console.error('Speech recognition error:', error)
      if (error.message?.includes('permission')) {
        setVoiceError('Microphone permission denied')
      } else if (error.message?.includes('No match')) {
        setVoiceError('Could not understand. Please try again.')
      } else {
        setVoiceError('Voice error: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setIsListening(false)
    }
  }

  // Stop listening
  const stopListening = async () => {
    try {
      await SpeechRecognition.stop()
    } catch (e) {
      console.log('Stop error:', e)
    }
    setIsListening(false)
  }

  // Toggle voice
  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMachine || !farmerName || !acres || !location) {
      alert('Please fill all required fields')
      return
    }

    setLoading(true)
    try {
      await createBooking({
        machine_id: selectedMachine,
        farmer_id: user?.id || 'guest',
        farmer_name: farmerName,
        farmer_phone: farmerPhone,
        scheduled_date: new Date().toISOString(),
        acres: parseFloat(acres),
        location: location,
        notes: cropType ? `Crop: ${cropType}` : ''
      })
      speak(voiceLanguage === 'hi-IN' ? 'बुकिंग सफल!' : 'Booking successful!', voiceLanguage)
      navigate('/bookings')
    } catch (err: any) {
      alert(err.message || 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="book-page">
      {/* Header */}
      <header className="book-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2>Book Machine</h2>
        <div className="lang-selector">
          <select value={voiceLanguage} onChange={(e) => setVoiceLanguage(e.target.value as any)}>
            <option value="hi-IN">हिंदी</option>
            <option value="en-IN">English</option>
            <option value="bn-IN">বাংলা</option>
          </select>
        </div>
      </header>

      {/* Voice Input Section */}
      <div className="voice-section">
        <div className="voice-instructions">
          <p className="voice-title">🎤 {voiceLanguage === 'hi-IN' ? 'आवाज से भरें:' : voiceLanguage === 'bn-IN' ? 'কণ্ঠে পূরণ করুন:' : 'Fill by Voice:'}</p>
          <p className="example-text">
            {voiceLanguage === 'hi-IN' 
              ? '"मेरा नाम राम है, गेहूं, 5 एकड़, गांव रामपुर"'
              : voiceLanguage === 'bn-IN'
              ? '"আমার নাম রাম, ধান, ৫ বিঘা, গ্রাম রামপুর"'
              : '"My name is Ram, Wheat, 5 acres, village Rampur"'}
          </p>
        </div>
        
        <button 
          className={`voice-btn ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
          onClick={toggleListening}
          disabled={!voiceSupported}
        >
          {isListening ? (
            <>
              <div className="pulse-ring"></div>
              <MicOff size={36} />
            </>
          ) : (
            <Mic size={36} />
          )}
        </button>
        
        <p className="voice-status">
          {!voiceSupported 
            ? '❌ Voice not supported'
            : isListening 
            ? (voiceLanguage === 'hi-IN' ? '🔴 सुन रहा हूं... बोलें!' : '🔴 Listening... Speak now!')
            : (voiceLanguage === 'hi-IN' ? 'माइक दबाएं और बोलें' : 'Tap mic and speak')}
        </p>
        
        {voiceError && (
          <div className="voice-error">
            <AlertCircle size={16} />
            <span>{voiceError}</span>
          </div>
        )}
        
        {transcript && (
          <div className="transcript">
            <Volume2 size={16} />
            <span>"{transcript}"</span>
          </div>
        )}
      </div>

      {/* Crop Selection */}
      <div className="crop-section">
        <button 
          className="crop-toggle"
          onClick={() => setShowCropGuide(!showCropGuide)}
        >
          <Leaf size={20} />
          <span>{selectedCrop ? `${selectedCrop.icon} ${selectedCrop.names.en}` : 'Select Crop / फसल चुनें'}</span>
          {showCropGuide ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showCropGuide && (
          <div className="crop-guide">
            <div className="crop-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search crops..."
                value={cropSearchTerm}
                onChange={(e) => setCropSearchTerm(e.target.value)}
              />
            </div>
            <div className="crop-list">
              {filteredCrops.map((crop: CropData) => (
                <button
                  key={crop.id}
                  className={`crop-item ${selectedCrop?.id === crop.id ? 'selected' : ''}`}
                  onClick={() => {
                    setCropType(crop.id)
                    setSelectedCrop(crop)
                    autoSelectMachineForCrop(crop)
                    setShowCropGuide(false)
                  }}
                >
                  <span className="crop-icon">{crop.icon}</span>
                  <div className="crop-info">
                    <span className="crop-name">{crop.names.en}</span>
                    <span className="crop-hindi">{crop.names.hi}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Form */}
      <form className="book-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Machine / मशीन</label>
          <select 
            value={selectedMachine} 
            onChange={(e) => setSelectedMachine(e.target.value)}
            required
          >
            <option value="">Select Machine</option>
            {availableMachines.map(m => (
              <option key={m.id} value={m.id}>
                {m.id} - {m.state === 'idle' ? '✓ Available' : '⚡ Working'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Your Name / आपका नाम</label>
          <input
            type="text"
            value={farmerName}
            onChange={(e) => setFarmerName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="form-group">
          <label>Phone Number / फोन नंबर</label>
          <input
            type="tel"
            value={farmerPhone}
            onChange={(e) => setFarmerPhone(e.target.value)}
            placeholder="Enter phone number"
          />
        </div>

        <div className="form-group">
          <label>Land Area (Acres) / जमीन (एकड़)</label>
          <input
            type="number"
            value={acres}
            onChange={(e) => setAcres(e.target.value)}
            placeholder="Enter acres"
            step="0.5"
            min="0.5"
            required
          />
        </div>

        <div className="form-group">
          <label>Village/Location / गांव</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter village name"
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Booking...' : 'Confirm Booking / बुकिंग करें'}
        </button>
      </form>
    </div>
  )
}
