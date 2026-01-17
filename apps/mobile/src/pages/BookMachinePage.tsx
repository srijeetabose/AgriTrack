import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MapPin, Check, Edit2, CheckCircle, Download, Share2, Home, MessageCircle, FileText, ThumbsUp, ThumbsDown } from 'lucide-react'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useLanguage } from '../context/LanguageContext'
import { createBooking } from '../lib/api'
import './BookMachinePage.css'

type SpeechLanguage = 'hi-IN' | 'en-IN' | 'bn-IN'
type Step = 'crop' | 'acres' | 'schedule' | 'confirm' | 'receipt' | 'feedback'

interface BookingReceipt {
  id: string
  farmer_name: string
  farmer_phone: string
  machine_id: string
  crop: string
  acres: number
  location: string
  status: string
  created_at: string
  scheduled_date: string
  scheduled_time: string
}

interface Crop {
  id: string
  en: string
  hi: string
  bn: string
  icon: string
  keywords: string[]
}

const CROPS: Crop[] = [
  { id: 'rice', en: 'Rice', hi: 'धान', bn: 'ধান', icon: '🌾', keywords: ['rice', 'dhan', 'chawal', 'धान', 'धन', 'ধান'] },
  { id: 'maize', en: 'Maize', hi: 'मक्का', bn: 'ভুট্টা', icon: '🌽', keywords: ['maize', 'corn', 'makka', 'bhutta', 'butta', 'मक्का', 'ভুট্টা'] },
  { id: 'sugarcane', en: 'Sugarcane', hi: 'गन्ना', bn: 'আখ', icon: '🎋', keywords: ['sugarcane', 'ganna', 'aakh', 'गन्ना', 'আখ'] },
  { id: 'cotton', en: 'Cotton', hi: 'कपास', bn: 'তুলা', icon: '☁️', keywords: ['cotton', 'kapas', 'tula', 'कपास', 'তুলা'] },
]

const TRANSLATIONS = {
  'hi-IN': {
    booking: 'मशीन बुक करें',
    chooseCrop: 'अपनी फसल चुनें',
    askAcres: 'कितने एकड़ जमीन है?',
    askLocation: 'गांव का नाम बोलें',
    confirmBooking: 'बुकिंग पुष्टि',
    crop: 'फसल चुनें',
    area: 'जमीन (एकड़)',
    location: 'स्थान',
    machine: 'मशीन',
    confirm: 'बुकिंग करें',
    success: 'बुकिंग सफल!',
    acres: 'एकड़',
    name: 'नाम',
    phone: 'फोन',
    next: 'आगे',
    schedule: 'तारीख और समय चुनें',
    selectDate: 'तारीख चुनें',
    selectTime: 'समय चुनें',
    arrivalDate: 'मशीन आगमन तारीख',
    arrivalTime: 'मशीन आगमन समय',
  },
  'en-IN': {
    booking: 'Book Machine',
    chooseCrop: 'Select your crop',
    askAcres: 'How many acres?',
    askLocation: 'Say village name',
    confirmBooking: 'Confirm Booking',
    crop: 'Select Crop',
    area: 'Land (acres)',
    location: 'Location',
    machine: 'Machine',
    confirm: 'Book Now',
    success: 'Booking successful!',
    acres: 'acres',
    name: 'Name',
    phone: 'Phone',
    next: 'Next',
    schedule: 'Select Date & Time',
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    arrivalDate: 'Machine Arrival Date',
    arrivalTime: 'Machine Arrival Time',
  },
  'bn-IN': {
    booking: 'মেশিন বুক',
    chooseCrop: 'ফসল নির্বাচন করুন',
    askAcres: 'কত বিঘা জমি?',
    askLocation: 'গ্রামের নাম বলুন',
    confirmBooking: 'বুকিং নিশ্চিত',
    crop: 'ফসল নির্বাচন',
    area: 'জমি (বিঘা)',
    location: 'অবস্থান',
    machine: 'মেশিন',
    confirm: 'বুক করুন',
    success: 'বুকিং সফল!',
    acres: 'বিঘা',
    name: 'নাম',
    phone: 'ফোন',
    next: 'পরবর্তী',
    schedule: 'তারিখ ও সময় নির্বাচন করুন',
    selectDate: 'তারিখ নির্বাচন করুন',
    selectTime: 'সময় নির্বাচন করুন',
    arrivalDate: 'মেশিন আগমনের তারিখ',
    arrivalTime: 'মেশিন আগমনের সময়',
  }
}

const NUMBER_WORDS: Record<string, number> = {
  // English
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20,
  // Hindi (Devanagari)
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'पंद्रह': 15, 'बीस': 20,
  // Hindi (Romanized)
  'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'panch': 5,
  'chhe': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
  // Bengali (Bengali script)
  'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5,
  'ছয়': 6, 'সাত': 7, 'আট': 8, 'নয়': 9, 'দশ': 10,
  'এগারো': 11, 'বারো': 12, 'পনেরো': 15, 'কুড়ি': 20,
  // Bengali (Romanized)
  'dui': 2, 'tin': 3, 'pach': 5,
}

export default function BookMachinePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { machines } = useSocket()
  const { language: appLanguage, setLanguage: setAppLanguage } = useLanguage()

  // Map app language to speech language
  const getSpeechLang = (): SpeechLanguage => {
    if (appLanguage === 'hi') return 'hi-IN'
    if (appLanguage === 'bn') return 'bn-IN'
    return 'en-IN'
  }
  
  const [speechLang, setSpeechLang] = useState<SpeechLanguage>(getSpeechLang())
  const [step, setStep] = useState<Step>('crop')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null)
  const [acres, setAcres] = useState('')
  const [location, setLocation] = useState(user?.village || 'My Village')
  const [assignedMachine, setAssignedMachine] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [bookingReceipt, setBookingReceipt] = useState<BookingReceipt | null>(null)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const t = TRANSLATIONS[speechLang]
  
  // Sync speech language with app language
  useEffect(() => {
    setSpeechLang(getSpeechLang())
  }, [appLanguage])

  useEffect(() => {
    requestPermissions()
    if (user?.village) setLocation(user.village)
  }, [user])

  const requestPermissions = async () => {
    try {
      await SpeechRecognition.requestPermissions()
    } catch (e) {
      console.log('Permission error:', e)
    }
  }

  const speak = async (text: string) => {
    setIsSpeaking(true)
    try {
      await TextToSpeech.speak({ text, lang: speechLang, rate: 0.9, volume: 1.0 })
    } catch (e) {
      console.log('TTS error:', e)
    }
    setIsSpeaking(false)
  }

  const listen = async (): Promise<string> => {
    setIsListening(true)
    setTranscript('')
    try {
      const available = await SpeechRecognition.available()
      if (!available.available) {
        setIsListening(false)
        return ''
      }
      const result = await SpeechRecognition.start({
        language: speechLang,
        maxResults: 3,
        popup: true,
        partialResults: false
      })
      setIsListening(false)
      if (result.matches && result.matches.length > 0) {
        const text = result.matches[0]
        setTranscript(text)
        return text
      }
      return ''
    } catch (e) {
      console.log('Speech error:', e)
      setIsListening(false)
      return ''
    }
  }

  const parseNumber = (text: string): number | null => {
    const lower = text.toLowerCase().trim()
    // Check for Hindi/Bengali/English number words
    for (const [word, num] of Object.entries(NUMBER_WORDS)) {
      if (text.includes(word) || lower.includes(word.toLowerCase())) {
        console.log('Parsed number:', word, '=', num)
        return num
      }
    }
    // Check for digits
    const match = text.match(/\d+/)
    if (match) return parseInt(match[0])
    return null
  }

  const findCrop = (text: string): Crop | null => {
    const lower = text.toLowerCase().trim()
    for (const crop of CROPS) {
      // Check exact match with Hindi/Bengali names
      if (text.includes(crop.hi) || text.includes(crop.bn)) {
        return crop
      }
      // Check keywords
      for (const keyword of crop.keywords) {
        if (lower.includes(keyword.toLowerCase()) || text.includes(keyword)) {
          return crop
        }
      }
    }
    return null
  }

  const assignMachine = () => {
    const available = Array.from(machines.values()).filter(m => m.state === 'idle')
    const machine = available[0] || Array.from(machines.values())[0]
    const id = machine?.id || 'sim_001'
    setAssignedMachine(id)
    return id
  }

  const handleCropVoice = async () => {
    await speak(t.chooseCrop)
    const text = await listen()
    if (text) {
      const crop = findCrop(text)
      if (crop) {
        setSelectedCrop(crop)
        assignMachine()
        // Auto show next button is handled by state, user taps Next to proceed
      }
    }
  }

  const selectCropAndNext = (crop: Crop) => {
    setSelectedCrop(crop)
    assignMachine()
    setStep('acres')
  }

  const goToAcres = () => {
    if (selectedCrop) {
      setStep('acres')
    }
  }

  const handleAcresVoice = async () => {
    await speak(t.askAcres)
    const text = await listen()
    console.log('Acres voice input:', text)
    if (text) {
      const num = parseNumber(text)
      console.log('Parsed acres:', num)
      if (num) {
        setAcres(num.toString())
      } else {
        // If can't parse, try to use the raw text if it looks like a number
        const cleaned = text.replace(/[^\d]/g, '')
        if (cleaned) {
          setAcres(cleaned)
        }
      }
    }
  }

  const handleLocationVoice = async () => {
    await speak(t.askLocation)
    const text = await listen()
    if (text) setLocation(text)
  }

  const handleConfirm = async () => {
    if (!selectedCrop || !acres || !location) return
    setLoading(true)
    
    const bookingData = {
      machine_id: assignedMachine || 'sim_001',
      farmer_id: user?.id || 'guest',
      farmer_name: user?.name || 'Farmer',
      farmer_phone: user?.phone || '',
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      acres: parseFloat(acres),
      location,
      notes: 'Crop: ' + selectedCrop.en
    }
    
    try {
      const result = await createBooking(bookingData)
      
      // Create receipt from response
      const receipt: BookingReceipt = {
        id: result.id || (result as { booking?: { id: string } }).booking?.id || `BK${Date.now()}`,
        farmer_name: user?.name || 'Farmer',
        farmer_phone: user?.phone || '',
        machine_id: assignedMachine || 'sim_001',
        crop: selectedCrop.en,
        acres: parseFloat(acres),
        location,
        status: 'pending',
        created_at: new Date().toISOString(),
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime
      }
      
      setBookingReceipt(receipt)
      await speak(t.success)
      setStep('receipt')
    } catch (e: unknown) {
      // If API fails, create offline booking
      const offlineReceipt: BookingReceipt = {
        id: `offline_${Date.now()}`,
        farmer_name: user?.name || 'Farmer',
        farmer_phone: user?.phone || '',
        machine_id: assignedMachine || 'sim_001',
        crop: selectedCrop.en,
        acres: parseFloat(acres),
        location,
        status: 'pending (offline)',
        created_at: new Date().toISOString(),
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime
      }
      
      // Save to localStorage for later sync
      const offlineBookings = JSON.parse(localStorage.getItem('offline_bookings') || '[]')
      offlineBookings.push(offlineReceipt)
      localStorage.setItem('offline_bookings', JSON.stringify(offlineBookings))
      
      setBookingReceipt(offlineReceipt)
      await speak(t.success)
      setStep('receipt')
    } finally {
      setLoading(false)
    }
  }

  const getReceiptText = () => {
    if (!bookingReceipt) return ''
    return `🌾 AgriTrack Booking Receipt

📋 Booking ID: ${bookingReceipt.id}
👤 Name: ${bookingReceipt.farmer_name}
📱 Phone: ${bookingReceipt.farmer_phone}
🌱 Crop: ${bookingReceipt.crop}
📐 Area: ${bookingReceipt.acres} acres
📍 Location: ${bookingReceipt.location}
🚜 Machine: ${bookingReceipt.machine_id}
📅 Date: ${new Date(bookingReceipt.created_at).toLocaleDateString('en-IN')}
✅ Status: ${bookingReceipt.status}

This is your official booking receipt.
यह आपकी आधिकारिक बुकिंग रसीद है।`
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getReceiptText())
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleShareSMS = () => {
    const text = encodeURIComponent(getReceiptText())
    window.open(`sms:?body=${text}`, '_blank')
  }

  const handleDownloadPDF = () => {
    if (!bookingReceipt) return
    
    // Create a text file as PDF alternative (works on mobile)
    const receiptText = `
===========================================
        AgriTrack - Digital Receipt
        भारत सरकार | Government of India
===========================================

Booking ID: ${bookingReceipt.id}
Status: ${bookingReceipt.status.toUpperCase()}

----- Farmer Details -----
Name: ${bookingReceipt.farmer_name}
Phone: ${bookingReceipt.farmer_phone}
Location: ${bookingReceipt.location}

----- Booking Details -----
Crop: ${bookingReceipt.crop}
Land Area: ${bookingReceipt.acres} acres
Machine ID: ${bookingReceipt.machine_id}
Date: ${new Date(bookingReceipt.created_at).toLocaleString('en-IN')}

===========================================
This is a valid booking receipt.
Show this to authorities if needed.
यह एक वैध बुकिंग रसीद है।
===========================================
`
    
    const blob = new Blob([receiptText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AgriTrack_Receipt_${bookingReceipt.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (!bookingReceipt) return
    try {
      await navigator.share({
        title: 'AgriTrack Booking Receipt',
        text: getReceiptText(),
      })
    } catch (e) {
      console.log('Share failed:', e)
    }
  }

  const getCropName = (crop: Crop) => {
    if (speechLang === 'hi-IN') return crop.hi
    if (speechLang === 'bn-IN') return crop.bn
    return crop.en
  }
  
  const handleLanguageChange = (lang: SpeechLanguage) => {
    setSpeechLang(lang)
    // Also update app-wide language
    if (lang === 'hi-IN') setAppLanguage('hi')
    else if (lang === 'bn-IN') setAppLanguage('bn')
    else setAppLanguage('en')
  }

  return (
    <div className="book-page">
      <header className="book-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2>{t.booking}</h2>
        <select 
          className="lang-select"
          value={speechLang} 
          onChange={(e) => handleLanguageChange(e.target.value as SpeechLanguage)}
        >
          <option value="en-IN">EN</option>
          <option value="hi-IN">हिंदी</option>
          <option value="bn-IN">বাংলা</option>
        </select>
      </header>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: step === 'crop' ? '25%' : step === 'acres' ? '50%' : step === 'schedule' ? '75%' : '100%' }} />
      </div>

      <div className="book-content">
        {step === 'crop' && (
          <div className="step-container">
            <h3 className="step-title">{t.crop}</h3>
            
            <button 
              className={'voice-btn-inline' + (isListening ? ' listening' : '') + (isSpeaking ? ' speaking' : '')}
              onClick={handleCropVoice}
              disabled={isListening || isSpeaking}
            >
              <Mic size={20} />
              <span>{isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Voice'}</span>
            </button>

            {transcript && (
              <div className="transcript">
                <Check size={16} />
                <span>{transcript}</span>
              </div>
            )}

            <div className="crop-grid">
              {CROPS.map(crop => (
                <button
                  key={crop.id}
                  className={'crop-card' + (selectedCrop?.id === crop.id ? ' selected' : '')}
                  onClick={() => selectCropAndNext(crop)}
                >
                  <span className="crop-icon">{crop.icon}</span>
                  <span className="crop-name">{getCropName(crop)}</span>
                </button>
              ))}
            </div>

            {selectedCrop && (
              <div className="next-section">
                <div className="selected-info">
                  ✓ {getCropName(selectedCrop)} selected
                </div>
                <button className="next-btn" onClick={goToAcres}>
                  {t.next} →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'acres' && (
          <div className="step-container">
            <h3 className="step-title">{t.area}</h3>
            
            <div className="selected-chip">
              {selectedCrop?.icon} {selectedCrop && getCropName(selectedCrop)}
            </div>

            <button 
              className={'voice-btn-inline' + (isListening ? ' listening' : '') + (isSpeaking ? ' speaking' : '')}
              onClick={handleAcresVoice}
              disabled={isListening || isSpeaking}
            >
              <Mic size={20} />
              <span>{isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Voice'}</span>
            </button>

            {transcript && (
              <div className="transcript">
                <Check size={16} />
                <span>{transcript}</span>
              </div>
            )}

            <div className="manual-input">
              <input
                type="number"
                placeholder={t.area}
                value={acres}
                onChange={(e) => setAcres(e.target.value)}
              />
              <button 
                className="next-btn"
                disabled={!acres}
                onClick={() => setStep('schedule')}
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {step === 'schedule' && (
          <div className="step-container">
            <h3 className="step-title">📅 {t.schedule}</h3>
            
            <div className="selected-chip">
              {selectedCrop?.icon} {selectedCrop && getCropName(selectedCrop)} • {acres} {t.acres}
            </div>

            <div className="schedule-form">
              <div className="schedule-field">
                <label>{t.selectDate}</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="schedule-field">
                <label>{t.selectTime}</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            <button 
              className="next-btn"
              disabled={!scheduledDate || !scheduledTime}
              onClick={() => setStep('confirm')}
            >
              {t.next}
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="step-container">
            <h3 className="step-title">{t.confirmBooking}</h3>
            
            <div className="confirm-card">
              <div className="confirm-row">
                <span className="confirm-label">{t.name}</span>
                <span className="confirm-value">{user?.name || 'Farmer'}</span>
              </div>
              <div className="confirm-row">
                <span className="confirm-label">{t.phone}</span>
                <span className="confirm-value">{user?.phone || '-'}</span>
              </div>
              <div className="confirm-row">
                <span className="confirm-label">{t.crop}</span>
                <span className="confirm-value">
                  {selectedCrop?.icon} {selectedCrop && getCropName(selectedCrop)}
                </span>
              </div>
              <div className="confirm-row">
                <span className="confirm-label">{t.area}</span>
                <span className="confirm-value">{acres} {t.acres}</span>
              </div>
              <div className="confirm-row clickable" onClick={handleLocationVoice}>
                <span className="confirm-label">
                  <MapPin size={14} /> {t.location}
                </span>
                <span className="confirm-value">
                  {location} <Edit2 size={14} />
                </span>
              </div>
              <div className="confirm-row">
                <span className="confirm-label">{t.machine}</span>
                <span className="confirm-value">{assignedMachine}</span>
              </div>
              <div className="confirm-row highlight">
                <span className="confirm-label">📅 {t.arrivalDate}</span>
                <span className="confirm-value">{scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
              </div>
              <div className="confirm-row highlight">
                <span className="confirm-label">⏰ {t.arrivalTime}</span>
                <span className="confirm-value">{scheduledTime || '-'}</span>
              </div>
            </div>

            <button 
              className="submit-btn"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? '...' : t.confirm}
            </button>
          </div>
        )}

        {step === 'receipt' && bookingReceipt && (
          <div className="receipt-container">
            <div className="receipt-success">
              <CheckCircle size={48} />
              <h2>{speechLang === 'hi-IN' ? 'बुकिंग सफल!' : speechLang === 'bn-IN' ? 'বুকিং সফল!' : 'Booking Confirmed!'}</h2>
              <p>{speechLang === 'hi-IN' ? 'रसीद जनरेट हो गई' : speechLang === 'bn-IN' ? 'রসিদ তৈরি হয়েছে' : 'Receipt Generated'}</p>
            </div>

            <div className="receipt-card">
              <div className="receipt-header">
                <span>🇮🇳</span>
                <div>
                  <strong>AgriTrack</strong>
                  <small>{speechLang === 'hi-IN' ? 'भारत सरकार' : speechLang === 'bn-IN' ? 'ভারত সরকার' : 'Government of India'}</small>
                </div>
              </div>

              <div className="receipt-id">
                <span>{speechLang === 'hi-IN' ? 'बुकिंग आईडी' : speechLang === 'bn-IN' ? 'বুকিং আইডি' : 'Booking ID'}</span>
                <strong>{bookingReceipt.id}</strong>
              </div>

              <div className="receipt-details">
                <div className="receipt-row">
                  <span>{t.name}</span>
                  <strong>{bookingReceipt.farmer_name}</strong>
                </div>
                <div className="receipt-row">
                  <span>{t.phone}</span>
                  <strong>{bookingReceipt.farmer_phone}</strong>
                </div>
                <div className="receipt-row">
                  <span>{t.crop}</span>
                  <strong>{selectedCrop?.icon} {bookingReceipt.crop}</strong>
                </div>
                <div className="receipt-row">
                  <span>{t.area}</span>
                  <strong>{bookingReceipt.acres} {t.acres}</strong>
                </div>
                <div className="receipt-row">
                  <span>{t.location}</span>
                  <strong>{bookingReceipt.location}</strong>
                </div>
                <div className="receipt-row">
                  <span>{t.machine}</span>
                  <strong>{bookingReceipt.machine_id}</strong>
                </div>
                <div className="receipt-row">
                  <span>Status</span>
                  <strong className="status-badge">{bookingReceipt.status}</strong>
                </div>
                <div className="receipt-row highlight-row">
                  <span>📅 {t.arrivalDate}</span>
                  <strong>{bookingReceipt.scheduled_date ? new Date(bookingReceipt.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</strong>
                </div>
                <div className="receipt-row highlight-row">
                  <span>⏰ {t.arrivalTime}</span>
                  <strong>{bookingReceipt.scheduled_time || '-'}</strong>
                </div>
                <div className="receipt-row">
                  <span>{speechLang === 'hi-IN' ? 'बुकिंग तारीख' : 'Booking Date'}</span>
                  <strong>{new Date(bookingReceipt.created_at).toLocaleDateString('en-IN')}</strong>
                </div>
              </div>

              {bookingReceipt.id.startsWith('offline_') && (
                <div className="offline-notice">
                  📵 {speechLang === 'hi-IN' ? 'ऑफलाइन मोड - ऑनलाइन होने पर सिंक होगा' : 'Offline Mode - Will sync when online'}
                </div>
              )}

              <div className="receipt-note">
                <strong>⚠️ {speechLang === 'hi-IN' ? 'महत्वपूर्ण' : speechLang === 'bn-IN' ? 'গুরুত্বপূর্ণ' : 'Important'}</strong>
                <p>{speechLang === 'hi-IN' ? 'यह आपकी आधिकारिक बुकिंग रसीद है। इसे सुरक्षित रखें।' : speechLang === 'bn-IN' ? 'এটি আপনার অফিসিয়াল বুকিং রসিদ। এটি নিরাপদ রাখুন।' : 'This is your official booking receipt. Keep it safe.'}</p>
              </div>
            </div>

            {/* Share Options */}
            <div className="share-section">
              <h4>{speechLang === 'hi-IN' ? 'रसीद शेयर करें' : speechLang === 'bn-IN' ? 'রসিদ শেয়ার করুন' : 'Share Receipt'}</h4>
              <div className="share-buttons">
                <button className="share-btn whatsapp" onClick={handleShareWhatsApp}>
                  <MessageCircle size={20} />
                  <span>WhatsApp</span>
                </button>
                <button className="share-btn sms" onClick={handleShareSMS}>
                  <MessageCircle size={20} />
                  <span>SMS</span>
                </button>
                <button className="share-btn download" onClick={handleDownloadPDF}>
                  <Download size={20} />
                  <span>{speechLang === 'hi-IN' ? 'डाउनलोड' : 'Download'}</span>
                </button>
                <button className="share-btn other" onClick={handleShare}>
                  <Share2 size={20} />
                  <span>{speechLang === 'hi-IN' ? 'अन्य' : 'Other'}</span>
                </button>
              </div>
            </div>

            <button className="feedback-btn" onClick={() => setStep('feedback')}>
              <FileText size={20} />
              <span>{speechLang === 'hi-IN' ? 'फीडबैक दें' : speechLang === 'bn-IN' ? 'ফিডব্যাক দিন' : 'Give Feedback'}</span>
            </button>

            <button className="home-btn" onClick={() => navigate('/')}>
              <Home size={20} />
              <span>{speechLang === 'hi-IN' ? 'होम पर जाएं' : speechLang === 'bn-IN' ? 'হোমে যান' : 'Go to Home'}</span>
            </button>

            <button className="bookings-btn" onClick={() => navigate('/bookings')}>
              {speechLang === 'hi-IN' ? 'सभी बुकिंग देखें' : speechLang === 'bn-IN' ? 'সব বুকিং দেখুন' : 'View All Bookings'}
            </button>
          </div>
        )}

        {step === 'feedback' && (
          <div className="feedback-container">
            <h3 className="feedback-title">
              {speechLang === 'hi-IN' ? 'अपना अनुभव साझा करें' : speechLang === 'bn-IN' ? 'আপনার অভিজ্ঞতা শেয়ার করুন' : 'Rate Your Experience'}
            </h3>
            <p className="feedback-subtitle">
              {speechLang === 'hi-IN' ? 'आपका अनुभव साझा करें' : 'Share your experience'}
            </p>

            <div className="feedback-card">
              <h4>{speechLang === 'hi-IN' ? 'कार्य पूर्णता फीडबैक' : 'Work Completion Feedback'}</h4>
              <p>{speechLang === 'hi-IN' ? 'क्या काम आपकी संतुष्टि के अनुसार पूरा हुआ?' : 'Is the work completed to your satisfaction?'}</p>
              
              <div className="feedback-options">
                <button className="feedback-option yes" onClick={() => {
                  alert(speechLang === 'hi-IN' ? 'धन्यवाद! आपका फीडबैक दर्ज हो गया।' : 'Thank you! Your feedback has been recorded.')
                  navigate('/')
                }}>
                  <ThumbsUp size={24} />
                  <span>{speechLang === 'hi-IN' ? 'हाँ, काम ठीक है' : 'Yes, Work is OK'}</span>
                </button>
                <button className="feedback-option no" onClick={() => {
                  alert(speechLang === 'hi-IN' ? 'हम जल्द ही आपसे संपर्क करेंगे।' : 'We will contact you soon.')
                  navigate('/')
                }}>
                  <ThumbsDown size={24} />
                  <span>{speechLang === 'hi-IN' ? 'नहीं, फिर से करें' : 'No, Needs Redo'}</span>
                </button>
              </div>

              <button className="cancel-feedback" onClick={() => setStep('receipt')}>
                {speechLang === 'hi-IN' ? 'रद्द करें' : 'Cancel'}
              </button>
            </div>

            <button className="view-receipt-btn" onClick={() => setStep('receipt')}>
              <FileText size={20} />
              <span>{speechLang === 'hi-IN' ? 'डिजिटल रसीद देखें' : 'View Digital Receipt'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
