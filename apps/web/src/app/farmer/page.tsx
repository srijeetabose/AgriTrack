'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Tractor, BookOpen, Activity, Mic, MapPin, Clock, LogOut, Globe, ChevronRight, Sparkles } from 'lucide-react';
import io from 'socket.io-client';

// Language translations
const translations = {
  en: {
    title: 'AgriTrack',
    subtitle: 'Farmer Portal',
    welcome: 'Welcome, Farmer!',
    bookMachine: 'Book Machine',
    bookMachineDesc: 'Reserve equipment for your field',
    myBookings: 'My Bookings',
    myBookingsDesc: 'Track your reservations',
    availableMachines: 'Available Machines',
    nearYou: 'Near You',
    nearest: 'NEAREST',
    available: 'Available',
    working: 'Working',
    distance: 'Distance',
    eta: 'ETA',
    noMachines: 'No machines available at the moment',
    findingMachines: 'Finding nearest machines...',
    voiceAssistant: 'Voice Assistant Available',
    voiceHint: 'Use voice commands on booking page',
    logout: 'Logout',
    language: 'Language',
    locationError: 'Location access denied. Showing all machines.',
    bookNow: 'Book Now',
    temp: 'Temperature',
    speed: 'Speed',
    vibration: 'Vibration'
  },
  hi: {
    title: 'एग्रीट्रैक',
    subtitle: 'किसान पोर्टल',
    welcome: 'स्वागत है, किसान!',
    bookMachine: 'मशीन बुक करें',
    bookMachineDesc: 'अपने खेत के लिए उपकरण आरक्षित करें',
    myBookings: 'मेरी बुकिंग',
    myBookingsDesc: 'अपनी बुकिंग देखें',
    availableMachines: 'उपलब्ध मशीनें',
    nearYou: 'आपके पास',
    nearest: 'सबसे नज़दीक',
    available: 'उपलब्ध',
    working: 'काम पर',
    distance: 'दूरी',
    eta: 'पहुँचने का समय',
    noMachines: 'इस समय कोई मशीन उपलब्ध नहीं है',
    findingMachines: 'नज़दीकी मशीनें खोज रहे हैं...',
    voiceAssistant: 'वॉइस असिस्टेंट उपलब्ध',
    voiceHint: 'बुकिंग पेज पर आवाज़ से बोलें',
    logout: 'लॉग आउट',
    language: 'भाषा',
    locationError: 'लोकेशन एक्सेस नहीं मिली। सभी मशीनें दिखा रहे हैं।',
    bookNow: 'अभी बुक करें',
    temp: 'तापमान',
    speed: 'गति',
    vibration: 'कंपन'
  },
  bn: {
    title: 'এগ্রিট্র্যাক',
    subtitle: 'কৃষক পোর্টাল',
    welcome: 'স্বাগতম, কৃষক!',
    bookMachine: 'মেশিন বুক করুন',
    bookMachineDesc: 'আপনার মাঠের জন্য যন্ত্র সংরক্ষণ করুন',
    myBookings: 'আমার বুকিং',
    myBookingsDesc: 'আপনার বুকিং দেখুন',
    availableMachines: 'উপলব্ধ মেশিন',
    nearYou: 'আপনার কাছে',
    nearest: 'নিকটতম',
    available: 'উপলব্ধ',
    working: 'কাজ করছে',
    distance: 'দূরত্ব',
    eta: 'পৌঁছানোর সময়',
    noMachines: 'এই মুহূর্তে কোনো মেশিন উপলব্ধ নেই',
    findingMachines: 'কাছের মেশিন খুঁজছে...',
    voiceAssistant: 'ভয়েস অ্যাসিস্ট্যান্ট উপলব্ধ',
    voiceHint: 'বুকিং পেজে কথা বলে বুক করুন',
    logout: 'লগ আউট',
    language: 'ভাষা',
    locationError: 'লোকেশন অ্যাক্সেস দেওয়া হয়নি। সব মেশিন দেখাচ্ছে।',
    bookNow: 'এখনই বুক করুন',
    temp: 'তাপমাত্রা',
    speed: 'গতি',
    vibration: 'কম্পন'
  }
};

type Language = 'en' | 'hi' | 'bn';

interface Machine {
  id: string;
  name?: string;
  state: string;
  gps?: { lat: number; lng: number };
  temp?: number;
  vibration?: { x: number; y: number; z: number };
  speed?: number;
  distance?: {
    km: number;
    direction: string;
    eta: {
      minutes: number;
      formatted: string;
    };
  };
}

export default function FarmerHome() {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const t = translations[language];

  useEffect(() => {
    // Load saved language preference
    const savedLang = localStorage.getItem('agritrack_language') as Language;
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('agritrack_language', lang);
    setShowLangMenu(false);
  };

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          fetchMachines(location);
        },
        (error) => {
          console.warn('Location access denied:', error);
          setLocationError(t.locationError);
          fetchMachines(null);
        }
      );
    } else {
      setLocationError(t.locationError);
      fetchMachines(null);
    }

    // Connect to WebSocket for real-time updates
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    
    socket.on('device_update', (updatedMachine: Machine) => {
      setMachines(prev => {
        const exists = prev.find(m => m.id === updatedMachine.id);
        if (exists) {
          return prev.map(m => m.id === updatedMachine.id ? { ...m, ...updatedMachine } : m);
        }
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchMachines = async (location: { lat: number; lng: number } | null) => {
    setLoading(true);
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/machines/available`);
      
      if (location) {
        url.searchParams.append('lat', location.lat.toString());
        url.searchParams.append('lng', location.lng.toString());
        url.searchParams.append('limit', '5');
      } else {
        url.searchParams.append('limit', '5');
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      setMachines(data.machines || []);
    } catch (error) {
      console.error('Failed to fetch machines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('agritrack_token');
    localStorage.removeItem('agritrack_user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Tractor size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t.title}</h1>
                <p className="text-emerald-100 text-sm">{t.subtitle}</p>
              </div>
            </div>
            
            {/* Language & Logout */}
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-xl text-sm hover:bg-white/30 transition-colors"
                >
                  <Globe size={18} />
                  <span className="hidden sm:inline">{language.toUpperCase()}</span>
                </button>
                
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <button
                      onClick={() => changeLanguage('en')}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-emerald-50 flex items-center justify-between ${language === 'en' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'}`}
                    >
                      <span>English</span>
                      {language === 'en' && <span className="text-emerald-600">✓</span>}
                    </button>
                    <button
                      onClick={() => changeLanguage('hi')}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-emerald-50 flex items-center justify-between ${language === 'hi' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'}`}
                    >
                      <span>हिंदी</span>
                      {language === 'hi' && <span className="text-emerald-600">✓</span>}
                    </button>
                    <button
                      onClick={() => changeLanguage('bn')}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-emerald-50 flex items-center justify-between ${language === 'bn' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'}`}
                    >
                      <span>বাংলা</span>
                      {language === 'bn' && <span className="text-emerald-600">✓</span>}
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-xl text-sm hover:bg-red-500/80 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-200/50">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-800">{t.welcome}</h2>
          </div>
          <p className="text-gray-600 text-sm">Smart India Hackathon 2025</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/farmer/book')}
            className="group bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-emerald-300"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 text-left">{t.bookMachine}</h2>
            <p className="text-sm text-gray-500 text-left mt-1">{t.bookMachineDesc}</p>
            <div className="flex items-center text-emerald-600 text-sm font-medium mt-3">
              <span>{t.bookNow}</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => router.push('/farmer/bookings')}
            className="group bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-blue-300"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 text-left">{t.myBookings}</h2>
            <p className="text-sm text-gray-500 text-left mt-1">{t.myBookingsDesc}</p>
            <div className="flex items-center text-blue-600 text-sm font-medium mt-3">
              <span>View All</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Available Machines */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tractor className="text-emerald-600" size={22} />
              <h2 className="text-lg font-semibold text-gray-800">{t.availableMachines}</h2>
            </div>
            <span className="text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{t.nearYou}</span>
          </div>

          {locationError && (
            <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
              <span>⚠️</span>
              <span>{locationError}</span>
            </div>
          )}

          <div className="p-5">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-500 text-sm">{t.findingMachines}</p>
              </div>
            ) : machines.length === 0 ? (
              <div className="text-center py-12">
                <Tractor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t.noMachines}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {machines.map((machine, index) => (
                  <div
                    key={machine.id}
                    className="group border border-gray-100 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer"
                    onClick={() => router.push(`/farmer/book?machine=${machine.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Tractor size={20} className="text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-800">{machine.name || machine.id}</h3>
                            {index === 0 && machine.distance && (
                              <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium">
                                {t.nearest}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {machine.state === 'idle' ? (
                              <span className="text-emerald-600">✓ {t.available}</span>
                            ) : (
                              <span className="text-blue-600">⚡ {t.working}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Distance & ETA */}
                    {machine.distance && (
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin size={14} className="text-emerald-500" />
                          <span className="font-medium">{machine.distance.km} km</span>
                          <span className="text-gray-400">{machine.distance.direction}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock size={14} className="text-emerald-500" />
                          <span className="font-medium">{machine.distance.eta.formatted}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Voice Assistant Hint */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mic className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{t.voiceAssistant}</h3>
            <p className="text-sm text-gray-600 mt-1">{t.voiceHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
