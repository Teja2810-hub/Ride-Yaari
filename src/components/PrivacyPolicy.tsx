import React from 'react'
import { ArrowLeft, Shield, Eye, Lock, Users, Globe, Mail } from 'lucide-react'

interface PrivacyPolicyProps {
  onBack: () => void
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 to-indigo-100/90 travel-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Shield size={32} className="text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
              </div>
              <p className="text-gray-600">
                Last updated: January 2025
              </p>
            </div>

            <div className="prose max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Eye size={24} className="text-blue-600 mr-3" />
                  Information We Collect
                </h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Personal Information</h3>
                  <ul className="text-blue-800 space-y-2">
                    <li>• <strong>Account Information:</strong> Name, email address, age, gender, profile picture</li>
                    <li>• <strong>Travel Information:</strong> Flight details, departure/destination locations, travel dates</li>
                    <li>• <strong>Communication Data:</strong> Messages sent through our platform's chat system</li>
                    <li>• <strong>Location Data:</strong> Geographic coordinates for ride matching (when provided)</li>
                    <li>• <strong>Usage Data:</strong> How you interact with our platform, features used, time spent</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Lock size={24} className="text-green-600 mr-3" />
                  How We Use Your Information
                </h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                  <ul className="text-green-800 space-y-2">
                    <li>• <strong>Service Provision:</strong> Connect you with other travelers for trips and rides</li>
                    <li>• <strong>Communication:</strong> Enable secure messaging between users</li>
                    <li>• <strong>Safety & Security:</strong> Verify user identities and prevent fraudulent activity</li>
                    <li>• <strong>Platform Improvement:</strong> Analyze usage patterns to enhance user experience</li>
                    <li>• <strong>Customer Support:</strong> Respond to inquiries and resolve issues</li>
                    <li>• <strong>Legal Compliance:</strong> Meet regulatory requirements and protect user rights</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Users size={24} className="text-purple-600 mr-3" />
                  Information Sharing
                </h2>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-4">
                  <h3 className="font-semibold text-purple-900 mb-3">We Share Information With:</h3>
                  <ul className="text-purple-800 space-y-2">
                    <li>• <strong>Other Users:</strong> Your profile information and trip details are visible to help with matching</li>
                    <li>• <strong>Service Providers:</strong> Third-party services that help us operate the platform (hosting, analytics)</li>
                    <li>• <strong>Legal Authorities:</strong> When required by law or to protect user safety</li>
                  </ul>
                  <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                    <p className="text-purple-900 font-medium">We Never:</p>
                    <ul className="text-purple-800 text-sm mt-2">
                      <li>• Sell your personal information to third parties</li>
                      <li>• Share your private messages with other users</li>
                      <li>• Use your data for advertising purposes</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield size={24} className="text-red-600 mr-3" />
                  Data Security
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                  <ul className="text-red-800 space-y-2">
                    <li>• <strong>Encryption:</strong> All data is encrypted in transit and at rest</li>
                    <li>• <strong>Access Controls:</strong> Strict access controls limit who can view your information</li>
                    <li>• <strong>Regular Audits:</strong> We regularly review and update our security practices</li>
                    <li>• <strong>Secure Infrastructure:</strong> We use industry-standard cloud security providers</li>
                    <li>• <strong>Data Minimization:</strong> We only collect and store data necessary for our services</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe size={24} className="text-indigo-600 mr-3" />
                  Your Rights
                </h2>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-4">
                  <ul className="text-indigo-800 space-y-2">
                    <li>• <strong>Access:</strong> Request a copy of your personal data</li>
                    <li>• <strong>Correction:</strong> Update or correct inaccurate information</li>
                    <li>• <strong>Deletion:</strong> Request deletion of your account and associated data</li>
                    <li>• <strong>Portability:</strong> Export your data in a machine-readable format</li>
                    <li>• <strong>Objection:</strong> Object to certain types of data processing</li>
                    <li>• <strong>Restriction:</strong> Request limitation of data processing</li>
                  </ul>
                  <div className="mt-4 p-3 bg-indigo-100 rounded-lg">
                    <p className="text-indigo-900 text-sm">
                      To exercise these rights, contact us at <strong>privacy@rideyaari.com</strong> or through your account settings.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
                  <ul className="text-gray-800 space-y-2">
                    <li>• <strong>Account Data:</strong> Retained while your account is active</li>
                    <li>• <strong>Trip Data:</strong> Kept for 2 years after trip completion for safety and support purposes</li>
                    <li>• <strong>Messages:</strong> Stored for 1 year to facilitate ongoing conversations</li>
                    <li>• <strong>Usage Data:</strong> Anonymized and aggregated data may be retained longer for analytics</li>
                    <li>• <strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">International Transfers</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
                  <p className="text-yellow-800 mb-3">
                    RideYaari operates globally and may transfer your data to countries outside your residence. 
                    We ensure appropriate safeguards are in place:
                  </p>
                  <ul className="text-yellow-800 space-y-2">
                    <li>• Adequacy decisions by relevant authorities</li>
                    <li>• Standard contractual clauses</li>
                    <li>• Binding corporate rules</li>
                    <li>• Certification schemes</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-4">
                  <p className="text-orange-800">
                    RideYaari is not intended for users under 18 years of age. We do not knowingly collect 
                    personal information from children under 18. If we become aware that we have collected 
                    personal information from a child under 18, we will take steps to delete such information.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-4">
                  <p className="text-teal-800">
                    We may update this Privacy Policy from time to time. We will notify you of any material 
                    changes by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                    We encourage you to review this Privacy Policy periodically.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Mail size={24} className="text-blue-600 mr-3" />
                  Contact Us
                </h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-blue-800 mb-4">
                    If you have any questions about this Privacy Policy or our data practices, please contact us:
                  </p>
                  <div className="space-y-2 text-blue-800">
                    <p><strong>Email:</strong> privacy@rideyaari.com</p>
                    <p><strong>Support:</strong> support@rideyaari.com</p>
                    <p><strong>WhatsApp:</strong> +917093203981</p>
                    <p><strong>Address:</strong> RideYaari Privacy Team, India</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}