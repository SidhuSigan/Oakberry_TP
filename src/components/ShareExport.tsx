import React, { useState } from 'react';
import { Schedule, Worker } from '../types';
import { Share2, Download, Copy, X, MessageCircle } from 'lucide-react';
import { shareViaWhatsApp, shareText, generateShareMessage } from '../services/shareService';
import { downloadSchedulePDF } from '../services/pdfService';

interface ShareExportProps {
  schedule: Schedule;
  workers: Worker[];
  onClose: () => void;
}

const ShareExport: React.FC<ShareExportProps> = ({ schedule, workers, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareMethod, setShareMethod] = useState<'whatsapp' | 'pdf' | 'text' | null>(null);

  const handleWhatsAppShare = async () => {
    setIsSharing(true);
    setShareMethod('whatsapp');

    try {
      const success = await shareViaWhatsApp(schedule, workers);
      if (success) {
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      console.error('Failed to share via WhatsApp:', error);
      alert('Failed to share. Please try downloading the PDF instead.');
    } finally {
      setIsSharing(false);
      setShareMethod(null);
    }
  };

  const handleDownloadPDF = () => {
    setShareMethod('pdf');
    try {
      downloadSchedulePDF(schedule, workers);
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setShareMethod(null);
    }
  };

  const handleCopyText = async () => {
    setShareMethod('text');
    try {
      const message = generateShareMessage(schedule, workers);
      await shareText(message);
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      alert('Failed to copy schedule. Please try again.');
    } finally {
      setShareMethod(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Share Schedule</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Choose how you want to share the schedule:
          </p>

          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            disabled={isSharing}
            className="w-full p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors flex items-center space-x-3"
          >
            <div className="bg-green-500 p-2 rounded-full">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">Share via WhatsApp</div>
              <div className="text-sm text-gray-600">Send PDF schedule directly</div>
            </div>
            {shareMethod === 'whatsapp' && isSharing && (
              <div className="spinner w-5 h-5"></div>
            )}
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center space-x-3"
          >
            <div className="bg-blue-500 p-2 rounded-full">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">Download PDF</div>
              <div className="text-sm text-gray-600">Save schedule to your device</div>
            </div>
            {shareMethod === 'pdf' && (
              <div className="spinner w-5 h-5"></div>
            )}
          </button>

          {/* Copy Text */}
          <button
            onClick={handleCopyText}
            className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors flex items-center space-x-3"
          >
            <div className="bg-gray-500 p-2 rounded-full">
              <Copy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">Copy as Text</div>
              <div className="text-sm text-gray-600">Copy schedule to clipboard</div>
            </div>
            {shareMethod === 'text' && (
              <div className="spinner w-5 h-5"></div>
            )}
          </button>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600">
            💡 Tip: Use WhatsApp share for easy mobile sharing, or download the PDF to share via email or other apps.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareExport;