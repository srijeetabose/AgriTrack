'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface Booking {
  id: string;
  machine_id: string;
  farmer_name: string;
  farmer_phone: string;
  location: string;
  acres: number;
  status: string;
  created_at: string;
}

export default function PublicReceipt() {
  const params = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBooking();
  }, [params.id]);

  const loadBooking = async () => {
    const bookingId = params.id as string;
    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/bookings/${bookingId}`);
      
      if (!response.ok) {
        throw new Error('Booking not found');
      }
      
      const data = await response.json();
      setBooking(data);
    } catch (err) {
      console.error('Failed to load booking:', err);
      setError('Booking not found or invalid QR code');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (booking?.status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="text-green-500" size={48} />;
      case 'pending':
        return <Clock className="text-orange-500" size={48} />;
      default:
        return <AlertCircle className="text-red-500" size={48} />;
    }
  };

  const getStatusColor = () => {
    switch (booking?.status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-red-600 bg-red-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Receipt</h1>
          <p className="text-gray-600 mb-4">अमान्य रसीद</p>
          <p className="text-sm text-gray-500">{error || 'This booking could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      <div className="max-w-md mx-auto">
        {/* Receipt Card */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border-2 border-green-200">
          
          {/* Header with Government Branding */}
          <div className="bg-gradient-to-r from-orange-500 via-white to-green-600 h-2"></div>
          
          <div className="bg-blue-900 text-white p-6 text-center">
            <div className="text-4xl mb-2">🇮🇳</div>
            <h1 className="text-xl font-bold">AgriTrack - Digital Receipt</h1>
            <p className="text-blue-200 text-sm mt-1">भारत सरकार | Government of India</p>
          </div>

          {/* Status Badge */}
          <div className="bg-gray-50 p-4 border-b flex items-center justify-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm text-gray-600">Booking Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getStatusColor()}`}>
                {booking.status?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Booking ID */}
          <div className="p-4 bg-green-50 border-b text-center">
            <p className="text-sm text-gray-600">Booking ID | बुकिंग आईडी</p>
            <p className="text-2xl font-bold text-green-700 font-mono">{booking.id}</p>
          </div>

          {/* Details */}
          <div className="p-6">
            {/* Farmer Details Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">
                Farmer Details | किसान विवरण
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name | नाम</span>
                  <span className="font-semibold text-gray-900">{booking.farmer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone | फोन</span>
                  <span className="font-semibold text-gray-900">{booking.farmer_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location | स्थान</span>
                  <span className="font-semibold text-gray-900">{booking.location}</span>
                </div>
              </div>
            </div>

            {/* Booking Details Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">
                Booking Details | बुकिंग विवरण
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Machine ID | मशीन आईडी</span>
                  <span className="font-semibold text-gray-900">{booking.machine_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Land Area | भूमि क्षेत्र</span>
                  <span className="font-semibold text-gray-900">{booking.acres} acres</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date | तारीख</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(booking.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Box */}
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center">
              <CheckCircle className="text-green-600 mx-auto mb-2" size={32} />
              <p className="font-semibold text-green-800">This is a valid booking receipt.</p>
              <p className="text-sm text-green-700">Show this to authorities if needed.</p>
              <p className="text-xs text-green-600 mt-2">यह एक वैध बुकिंग रसीद है।</p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 p-4 text-center text-xs text-gray-500">
            <p>Crop Residue Management - AgriTrack</p>
            <p className="mt-1">Smart India Hackathon 2025</p>
          </div>

          {/* Tricolor Bottom */}
          <div className="bg-gradient-to-r from-orange-500 via-white to-green-600 h-2"></div>
        </div>
      </div>
    </div>
  );
}
