import React, { useState } from 'react';
import { Wrench, CheckCircle, AlertCircle } from 'lucide-react';
import { createTicket } from '../../services/serviceDeskService';
import { DeviceCondition } from '../../constants/serviceTypes';

const RepairService: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    brand: '',
    model: '',
    serialNumber: '',
    deviceType: '',
    otherDeviceDescription: '',
    problemDescription: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const condition: DeviceCondition = {
        screenOk: true,
        portsOk: true,
        bodyOk: true,
        batteryOk: true
      };

      const finalDeviceType = formData.deviceType === 'Other' && formData.otherDeviceDescription 
        ? `Other: ${formData.otherDeviceDescription}` 
        : formData.deviceType;

      createTicket({
        customerId: '', // Could link to actual user if logged in
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerPhone: formData.phone,
        devices: [
          {
            id: `dev_${Date.now()}`,
            type: finalDeviceType,
            brand: formData.brand,
            model: formData.model,
            serialNumber: formData.serialNumber,
            password: formData.password,
            conditionNotes: 'Intake Condition: Screen/Ports/Body/Battery OK',
            condition,
            accessories: 'None'
          }
        ],
        problemDescription: formData.problemDescription,
        urgency: 'normal'
      });
      
      setIsSubmitted(true);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to submit repair request. Please try again.');
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center bg-white rounded-2xl shadow-sm mt-12 border border-gray-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-4xl font-black mb-4 text-slate-900">Request Received!</h1>
        <p className="text-slate-500 text-lg mb-8">
          Thank you for submitting your repair request. Our team will review the details and get back to you shortly with an estimated quote and timeline.
        </p>
        <button 
          onClick={() => {
            setIsSubmitted(false);
            setFormData({
              firstName: '', lastName: '', email: '', phone: '',
              brand: '', model: '', serialNumber: '', deviceType: '',
              otherDeviceDescription: '', problemDescription: '', password: ''
            });
          }}
          className="bg-[#E31837] hover:bg-red-700 text-white px-8 py-3 rounded font-bold transition-colors"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  const labelClass = "block text-xs font-bold text-[#3B4D66] uppercase tracking-wider mb-2";
  const inputClass = "w-full bg-white border border-gray-200 rounded px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 py-12 w-full text-slate-800">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">Request a Repair</h1>
          <p className="text-slate-500 text-sm">
            Fill out the form below and our team will get back to you with an estimated quote and timeline.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-0 md:p-2 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Personal Info */}
            <div>
              <label className={labelClass}>First Name</label>
              <input 
                type="text" 
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input 
                type="text" 
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input 
                type="tel" 
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Brand</label>
              <input 
                type="text" 
                name="brand"
                required
                value={formData.brand}
                onChange={handleChange}
                placeholder="Dell, Apple..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <input 
                type="text" 
                name="model"
                required
                value={formData.model}
                onChange={handleChange}
                placeholder="XPS 15..."
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Serial / IMEI</label>
              <input 
                type="text" 
                name="serialNumber"
                required
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="SN12345678"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Device Type</label>
              <select 
                name="deviceType"
                required
                value={formData.deviceType}
                onChange={handleChange}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="">Select a device...</option>
                <option value="Desktop PC">Desktop PC</option>
                <option value="Laptop">Laptop</option>
                <option value="Gaming Console">Gaming Console</option>
                <option value="Individual Component">Individual Component (GPU, Motherboard, etc.)</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            {formData.deviceType === 'Other' && (
              <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className={labelClass}>Describe Other Device</label>
                <input 
                  type="text" 
                  name="otherDeviceDescription"
                  required
                  value={formData.otherDeviceDescription}
                  onChange={handleChange}
                  placeholder="e.g. Smartwatch, Drone..."
                  className={inputClass}
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className={labelClass}>Issue Description</label>
              <textarea 
                name="problemDescription"
                required
                value={formData.problemDescription}
                onChange={handleChange}
                placeholder="Please describe the problem you're experiencing in detail..."
                rows={4}
                className={`${inputClass} resize-none`}
              ></textarea>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Password / PIN (Optional)</label>
              <input 
                type="text" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="1234"
                className={inputClass}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-[#E31837] hover:bg-red-700 text-white font-bold py-4 rounded transition-colors flex items-center justify-center gap-2 mt-4"
          >
            Submit Request <CheckCircle className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default RepairService;

