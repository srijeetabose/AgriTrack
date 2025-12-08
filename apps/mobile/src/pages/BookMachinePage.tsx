import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Volume2, ChevronDown, ChevronUp, Search, Leaf } from 'lucide-react'
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
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
  'পাঁচ': 5, 'দশ': 10, 'কুড়ি': 20,
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
  const recognitionRef = useRef<any>(null)

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
    // Default to first available
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
    const words = text.split(/\s+/)
    for (const word of words) {
      const cleanWord = word.replace(/[।.,!?]/g, '')
      const crop = CROP_LOOKUP[cleanWord.toLowerCase()] || CROP_LOOKUP[cleanWord]
      if (crop) return crop
    }
    return null
  }

  // Extract acres from text
  const extractAcres = (text: string): number | null => {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:acre|acres|एकड़|বিঘা|একর)/i,
      /(?:acre|एकड़|বিঘা)\s*(\d+)/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const num = parseFloat(match[1])
        if (!isNaN(num) && num > 0) return num
      }
    }
    // Check number words
    for (const [word, value] of Object.entries(NUMBER_WORDS)) {
      if (text.includes(word)) return value
    }
    return null
  }

  // Extract location from text
  const extractLocation = (text: string): string | null => {
    const patterns = [
      /(?:village|गांव|গ্রাম)\s+([^\s,।]+)/i,
      /(?:from|से|থেকে)\s+([^\s,।]+)/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) return match[1]
    }
    return null
  }

  // Handle voice command
  const handleVoiceCommand = (command: string) => {
    console.log('Voice command:', command)
    const detectedLang = detectLanguage(command)
    setVoiceLanguage(detectedLang)
    
    let filledFields: string[] = []
    
    // Extract crop
    const crop = findCropFromVoice(command)
    if (crop) {
      setCropType(crop.id)
      setSelectedCrop(crop)
      autoSelectMachineForCrop(crop)
      filledFields.push('फसल/Crop')
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
        ? `${filledFields.length} जानकारी भरी गई`
        : `Filled ${filledFields.length} fields`
      speak(feedback, detectedLang)
    } else {
      speak(detectedLang === 'hi-IN' 
        ? 'कृपया फसल का नाम बोलें' 
        : 'Please say crop name', detectedLang)
    }
  }

  // Toggle voice listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    // Check for speech recognition support
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                                  (window as any).webkitSpeechRecognition ||
                                  (window as any).mozSpeechRecognition ||
                                  (window as any).msSpeechRecognition

    if (!SpeechRecognitionAPI) {
      alert('Voice input is not supported on this device. Please use a modern browser or Chrome.')
      return
    }

    try {
      recognitionRef.current = new SpeechRecognitionAPI()
      recognitionRef.current.continuous = true // Keep listening
      recognitionRef.current.interimResults = true // Show partial results
      recognitionRef.current.lang = voiceLanguage
      recognitionRef.current.maxAlternatives = 3 // Get multiple alternatives

      let fullTranscript = ''

      recognitionRef.current.onstart = () => {
        console.log('Voice recognition started')
        setIsListening(true)
        setTranscript('')
        fullTranscript = ''
      }

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        // Update display
        if (finalTranscript) {
          fullTranscript += finalTranscript
          setTranscript(fullTranscript.trim())
          // Process the final transcript
          handleVoiceCommand(fullTranscript.trim())
        } else if (interimTranscript) {
          setTranscript(fullTranscript + interimTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'no-speech') {
          speak(voiceLanguage === 'hi-IN' ? 'कुछ सुनाई नहीं दिया, फिर से बोलें' : 'No speech detected, try again', voiceLanguage)
        } else if (event.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow microphone access.')
        }
      }

      recognitionRef.current.onend = () => {
        console.log('Voice recognition ended')
        setIsListening(false)
      }

      recognitionRef.current.start()
      
      // Give audio feedback
      speak(voiceLanguage === 'hi-IN' 
        ? 'बोलिए - फसल का नाम, कितने एकड़, और गांव का नाम' 
        : voiceLanguage === 'bn-IN'
        ? 'বলুন - ফসলের নাম, কত বিঘা, এবং গ্রামের নাম'
        : 'Speak - crop name, how many acres, and village name', voiceLanguage)
        
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
      alert('Failed to start voice input. Please try again.')
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
          <p>🎤 {voiceLanguage === 'hi-IN' ? 'बोलें:' : voiceLanguage === 'bn-IN' ? 'বলুন:' : 'Say:'}</p>
          <p className="example-text">
            {voiceLanguage === 'hi-IN' 
              ? '"मुझे गेहूं के लिए 5 एकड़ जमीन जोतनी है, गांव रामपुर"'
              : voiceLanguage === 'bn-IN'
              ? '"আমার ধানের জন্য ৫ বিঘা জমি চাষ করতে হবে, গ্রাম রামপুর"'
              : '"I need to harvest wheat on 5 acres in village Rampur"'}
          </p>
        </div>
        
        <button 
          className={`voice-btn ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
          onClick={toggleListening}
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
          {isListening 
            ? (voiceLanguage === 'hi-IN' ? '🔴 सुन रहा हूं...' : voiceLanguage === 'bn-IN' ? '🔴 শুনছি...' : '🔴 Listening...')
            : (voiceLanguage === 'hi-IN' ? 'बोलने के लिए टैप करें' : voiceLanguage === 'bn-IN' ? 'কথা বলতে ট্যাপ করুন' : 'Tap to speak')}
        </p>
        
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
          <span>{selectedCrop ? `${selectedCrop.icon} ${selectedCrop.names.en}` : 'Select Crop'}</span>
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
          <label>Machine</label>
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
          <label>Your Name</label>
          <input
            type="text"
            value={farmerName}
            onChange={(e) => setFarmerName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            value={farmerPhone}
            onChange={(e) => setFarmerPhone(e.target.value)}
            placeholder="Enter phone number"
          />
        </div>

        <div className="form-group">
          <label>Land Area (Acres)</label>
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
          <label>Village/Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter village name"
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  )
}
