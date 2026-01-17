import { useEffect, useState } from 'react'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import './SplashScreen.css'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    // Speak "Namaste" and wait for it to complete before moving on
    const speakAndProceed = async () => {
      try {
        // Wait a moment before speaking
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Speak and wait for completion
        await TextToSpeech.speak({
          text: 'नमस्ते, AgriTrack में आपका स्वागत है',
          lang: 'hi-IN',
          rate: 0.85,
          volume: 1.0
        })
        
        // Speech completed, now fade out and proceed
        if (isMounted) {
          setFadeOut(true)
          setTimeout(() => {
            if (isMounted) onComplete()
          }, 1000)
        }
      } catch (error) {
        console.log('TTS error:', error)
        // Fallback - wait 3 seconds then proceed
        if (isMounted) {
          setTimeout(() => {
            setFadeOut(true)
            setTimeout(() => {
              if (isMounted) onComplete()
            }, 1000)
          }, 3000)
        }
      }
    }

    speakAndProceed()

    return () => {
      isMounted = false
      TextToSpeech.stop().catch(() => {})
    }
  }, [onComplete])

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <div className="splash-logo-container">
          <img src="/LOGO.png" alt="AgriTrack" className="splash-logo" />
        </div>
        <h1 className="splash-title">AgriTrack</h1>
        <p className="splash-tagline">Smart Farming, Sustainable Future</p>
        <div className="splash-loader">
          <div className="loader-dot"></div>
          <div className="loader-dot"></div>
          <div className="loader-dot"></div>
        </div>
      </div>
      <div className="splash-footer">
        <p>🌾 No Burn, More Earn 🌾</p>
      </div>
    </div>
  )
}
