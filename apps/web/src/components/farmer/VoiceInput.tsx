import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

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

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: 'hi-IN' | 'en-US';
  continuous?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ 
  onTranscript, 
  language = 'hi-IN',
  continuous = false 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      setIsSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        onTranscript(speechResult);
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, continuous, onTranscript]);

  const toggleListening = () => {
    if (!isSupported) {
      alert('Voice recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={toggleListening}
        className={`p-3 rounded-full transition-all ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white shadow-lg`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
      
      {transcript && (
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-900 max-w-xs">
          <strong>Heard:</strong> {transcript}
        </div>
      )}
    </div>
  );
};
