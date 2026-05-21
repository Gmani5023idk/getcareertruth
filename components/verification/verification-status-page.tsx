'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Upload,
  AlertCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { VerificationBadge, VerificationStatus } from './verification-badge';

const Linkedin = ({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

interface VerificationStatusPageProps {
  currentStatus: VerificationStatus;
  verificationMethod?: string;
  onVerify?: (method: string) => void;
}

export function VerificationStatusPage({
  currentStatus,
  verificationMethod,
  onVerify,
}: VerificationStatusPageProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const verificationMethods = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      description: 'Connect your LinkedIn profile to verify your employment',
      color: 'bg-blue-500',
    },
    {
      id: 'company-email',
      name: 'Company Email',
      icon: Mail,
      description: 'Verify using your official company email address',
      color: 'bg-teal-500',
    },
    {
      id: 'id-upload',
      name: 'Government ID',
      icon: Upload,
      description: 'Upload a government-issued ID for verification',
      color: 'bg-purple-500',
    },
  ];

  const getStatusContent = () => {
    switch (currentStatus) {
      case 'VERIFIED':
        return {
          icon: CheckCircle,
          title: 'Verified',
          description:
            'Your profile has been verified. You can now receive bookings.',
          color: 'text-teal-500',
          bgColor: 'bg-teal-50',
        };
      case 'PENDING':
        return {
          icon: Clock,
          title: 'Verification Pending',
          description:
            'Your verification request is being reviewed. This usually takes 1-2 business days.',
          color: 'text-amber-500',
          bgColor: 'bg-amber-50',
        };
      case 'UNVERIFIED':
        return {
          icon: XCircle,
          title: 'Not Verified',
          description:
            'Complete verification to start receiving bookings and build trust with students.',
          color: 'text-slate-400',
          bgColor: 'bg-slate-50',
        };
      case 'REJECTED':
        return {
          icon: XCircle,
          title: 'Verification Rejected',
          description:
            'Your verification was rejected. Please try again with a different method or contact support.',
          color: 'text-red-500',
          bgColor: 'bg-red-50',
        };
      default:
        return {
          icon: XCircle,
          title: 'Unknown Status',
          description: 'Please contact support for assistance.',
          color: 'text-slate-400',
          bgColor: 'bg-slate-50',
        };
    }
  };

  const statusContent = getStatusContent();
  const StatusIcon = statusContent.icon;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Status Card */}
      <Card variant="elevated" className="mb-6">
        <div className={`p-6 ${statusContent.bgColor}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${statusContent.bgColor}`}>
              <StatusIcon className={`w-8 h-8 ${statusContent.color}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {statusContent.title}
              </h2>
              <p className="text-slate-600">{statusContent.description}</p>
              {verificationMethod && currentStatus === 'VERIFIED' && (
                <div className="mt-3">
                  <VerificationBadge
                    status={currentStatus}
                    method={verificationMethod}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Verification Methods */}
      {currentStatus === 'UNVERIFIED' && (
        <Card variant="elevated">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Choose a Verification Method
            </h3>
            <p className="text-slate-600 mb-6">
              Select one of the following methods to verify your profile
            </p>

            <div className="space-y-4">
              {verificationMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <motion.div
                    key={method.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedMethod === method.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2 rounded-lg ${method.color} text-white`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">
                            {method.name}
                          </h4>
                          <p className="text-sm text-slate-600">
                            {method.description}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <div
                            className={`w-5 h-5 rounded-full border-2 ${
                              selectedMethod === method.id
                                ? 'border-teal-500 bg-teal-500'
                                : 'border-slate-300'
                            }`}
                          >
                            {selectedMethod === method.id && (
                              <CheckCircle className="w-full h-full text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Action Button */}
            <div className="mt-6">
              <Button
                variant="primary"
                className="w-full"
                disabled={!selectedMethod}
                onClick={() => selectedMethod && onVerify?.(selectedMethod)}
              >
                {selectedMethod ? 'Continue with Verification' : 'Select a Method'}
              </Button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 mb-1">
                    Why verify your profile?
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Build trust with students and parents</li>
                    <li>• Get priority placement in search results</li>
                    <li>• Receive more booking requests</li>
                    <li>• Display a verified badge on your profile</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Pending Info */}
      {currentStatus === 'PENDING' && (
        <Card variant="outlined">
          <div className="p-6">
            <h3 className="font-semibold text-slate-900 mb-3">
              What happens next?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-slate-900">Review Process</p>
                  <p className="text-sm text-slate-600">
                    Our team reviews your verification documents
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-slate-900">Verification</p>
                  <p className="text-sm text-slate-600">
                    We verify your employment and identity
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium text-slate-900">Approval</p>
                  <p className="text-sm text-slate-600">
                    You'll receive an email once verified
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
