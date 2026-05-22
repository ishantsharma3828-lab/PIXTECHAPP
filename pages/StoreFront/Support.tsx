import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, MessageCircle, FileText, Phone } from 'lucide-react';

const Support: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">How can we help you?</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Whether you need a repair, have a question about a product, or need technical assistance, we're here for you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <Link to="/repair" className="bg-[#111214] border border-white/5 p-8 rounded-2xl hover:border-red-500/50 hover:-translate-y-1 transition-all group text-center">
          <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-red-600/20 transition-colors">
            <Wrench className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Repair Service</h3>
          <p className="text-gray-400 text-sm">Submit a ticket for device repair, upgrades, or diagnostics.</p>
        </Link>

        <div className="bg-[#111214] border border-white/5 p-8 rounded-2xl hover:border-red-500/50 hover:-translate-y-1 transition-all group text-center cursor-pointer">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-600/20 transition-colors">
            <MessageCircle className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Live Chat</h3>
          <p className="text-gray-400 text-sm">Chat with our support team in real-time for quick answers.</p>
        </div>

        <div className="bg-[#111214] border border-white/5 p-8 rounded-2xl hover:border-red-500/50 hover:-translate-y-1 transition-all group text-center cursor-pointer">
          <div className="w-16 h-16 bg-green-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-600/20 transition-colors">
            <FileText className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Knowledge Base</h3>
          <p className="text-gray-400 text-sm">Browse our articles, guides, and FAQs for self-help.</p>
        </div>

        <div className="bg-[#111214] border border-white/5 p-8 rounded-2xl hover:border-red-500/50 hover:-translate-y-1 transition-all group text-center cursor-pointer">
          <div className="w-16 h-16 bg-purple-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-600/20 transition-colors">
            <Phone className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Contact Us</h3>
          <p className="text-gray-400 text-sm">Call us or send an email for general inquiries.</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-900/20 to-transparent border border-red-500/20 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="text-3xl font-black mb-2">Need immediate assistance?</h2>
          <p className="text-gray-400">Our technical experts are available Monday through Saturday, 9AM to 8PM.</p>
        </div>
        <div className="flex-shrink-0">
          <a href="tel:+1234567890" className="bg-white text-black hover:bg-slate-200 px-8 py-4 rounded-xl font-bold text-lg transition-colors inline-flex items-center gap-2">
            <Phone className="w-5 h-5" />
            (555) 123-4567
          </a>
        </div>
      </div>
    </div>
  );
};

export default Support;
