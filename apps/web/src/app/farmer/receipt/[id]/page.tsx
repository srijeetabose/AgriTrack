'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Share2, CheckCircle } from 'lucide-react';

interface Booking {
  id: string;
  machine_id: string;
  farmer_name: string;
  farmer_phone: string;
  location: string;
  acres: number;
  status: string;
  created_at: string;
  offline?: boolean;
}

export default function BookingReceipt() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBooking();
  }, [params.id]);

  const loadBooking = async () => {
    const bookingId = params.id as string;
    
    // Check if it's an offline booking
    if (bookingId.startsWith('offline_')) {
      const offlineBookings = JSON.parse(localStorage.getItem('offline_bookings') || '[]');
      const offlineBooking = offlineBookings.find((b: Booking) => b.id === bookingId);
      
      if (offlineBooking) {
        setBooking(offlineBooking);
        return;
      }
    }

    // Try to fetch from API
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/bookings/${bookingId}`);
      const data = await response.json();
      setBooking(data);
    } catch (error) {
      console.error('Failed to load booking:', error);
    }
  };

  const handleDownload = () => {
    if (!receiptRef.current) return;

    // Create a simple text receipt for download
    const receiptText = `
=================================
      AgriTrack - Digital Receipt
      भारत सरकार | Government of India
=================================

Booking ID: ${booking?.id}
Status: ${booking?.status?.toUpperCase()}

Farmer Details:
Name: ${booking?.farmer_name}
Phone: ${booking?.farmer_phone}
Location: ${booking?.location}

Booking Details:
Machine ID: ${booking?.machine_id}
Land Area: ${booking?.acres} acres
Date: ${new Date(booking?.created_at || '').toLocaleString()}

=================================
This is a valid booking receipt.
Show this to authorities if needed.
यह एक वैध बुकिंग रसीद है।
=================================
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AgriTrack_Receipt_${booking?.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share && booking) {
      try {
        await navigator.share({
          title: 'AgriTrack Booking Receipt',
          text: `Booking ID: ${booking.id}\nFarmer: ${booking.farmer_name}\nStatus: ${booking.status}`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/farmer')} className="hover:bg-green-700 p-2 rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Digital Receipt | डिजिटल रसीद</h1>
        </div>
      </div>

      {/* Receipt */}
      <div className="max-w-2xl mx-auto p-6">
        <div ref={receiptRef} className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-green-200">
          
          {/* Success Badge */}
          <div className="bg-green-600 text-white p-6 text-center">
            <CheckCircle size={48} className="mx-auto mb-3" />
            <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
            <p className="text-green-100 mt-1">बुकिंग सफल | Receipt Generated</p>
            {booking.offline && (
              <p className="text-xs mt-2 bg-orange-500 inline-block px-3 py-1 rounded">
                📵 Offline Mode - Will sync when online
              </p>
            )}
          </div>

          {/* Government Badge */}
          <div className="bg-blue-50 border-b-2 border-blue-200 p-4 text-center">
            <div className="text-2xl mb-2">🇮🇳</div>
            <p className="text-sm font-semibold text-blue-900">भारत सरकार | Government of India</p>
            <p className="text-xs text-blue-700">Crop Residue Management - AgriTrack</p>
          </div>

          {/* Booking Details */}
          <div className="p-6 space-y-4">
            <div className="text-center pb-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Booking ID</h3>
              <p className="text-2xl font-bold text-green-600 mt-1">{booking.id}</p>
              <p className="text-sm text-gray-600 mt-2">
                Status: <span className={`font-semibold ${
                  booking.status === 'pending' ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {booking.status.toUpperCase()}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Farmer Name</p>
                <p className="font-semibold">{booking.farmer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold">{booking.farmer_phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold">{booking.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Land Area</p>
                <p className="font-semibold">{booking.acres} acres</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Machine ID</p>
                <p className="font-semibold">{booking.machine_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Booking Date</p>
                <p className="font-semibold text-sm">
                  {new Date(booking.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-yellow-900 mb-1">⚠️ Important Notice</p>
              <p className="text-yellow-800">
                This is your official booking proof. Keep this receipt safe. Show it to authorities if questioned.
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                यह आपका आधिकारिक बुकिंग प्रमाण है। इसे सुरक्षित रखें।
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 p-4 flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
            >
              <Download size={20} />
              Download
            </button>
            <button
              onClick={handleShare}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
            >
              <Share2 size={20} />
              Share
            </button>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.push('/farmer/bookings')}
            className="w-full bg-white border-2 border-green-600 text-green-600 hover:bg-green-50 py-3 rounded-lg font-semibold"
          >
            View All Bookings
          </button>
          <button
            onClick={() => router.push('/farmer')}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
