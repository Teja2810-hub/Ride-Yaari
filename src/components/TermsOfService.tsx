import React from 'react'
import { ArrowLeft, FileText, Shield, AlertTriangle, Users, Gavel, Globe } from 'lucide-react'

interface TermsOfServiceProps {
  onBack: () => void
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
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
                <FileText size={32} className="text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
              </div>
              <p className="text-gray-600">
                Last updated: January 2025
              </p>
            </div>

            <div className="prose max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
                  <p className="text-blue-800">
                    By accessing and using RideYaari ("the Platform"), you accept and agree to be bound by the terms 
                    and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Users size={24} className="text-green-600 mr-3" />
                  2. Service Description
                </h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                  <p className="text-green-800 mb-3">
                    RideYaari is a platform that connects travelers for two main services:
                  </p>
                  <ul className="text-green-800 space-y-2">
                    <li>• <strong>Airport Trips:</strong> Share flight itineraries for package delivery, pickup services, travel assistance, and companionship</li>
                    <li>• <strong>Car Rides:</strong> Connect drivers and passengers for cost-effective, eco-friendly carpooling</li>
                  </ul>
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-green-900 font-medium">Important:</p>
                    <p className="text-green-800 text-sm">
                      RideYaari is a platform that facilitates connections between users. We do not provide transportation 
                      services directly and are not responsible for the actual services provided by users.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield size={24} className="text-purple-600 mr-3" />
                  3. User Responsibilities
                </h2>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-4">
                  <h3 className="font-semibold text-purple-900 mb-3">As a RideYaari user, you agree to:</h3>
                  <ul className="text-purple-800 space-y-2">
                    <li>• Provide accurate and truthful information in your profile and trip postings</li>
                    <li>• Verify the identity of other users before meeting or exchanging services</li>
                    <li>• Meet in public places and prioritize your personal safety</li>
                    <li>• Respect other users and communicate professionally</li>
                    <li>• Comply with all applicable laws and regulations</li>
                    <li>• Not use the platform for illegal activities or fraudulent purposes</li>
                    <li>• Not share inappropriate content or engage in harassment</li>
                    <li>• Be responsible for your own safety and the safety of others</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertTriangle size={24} className="text-red-600 mr-3" />
                  4. Safety and Liability
                </h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                  <div className="mb-4">
                    <h3 className="font-semibold text-red-900 mb-3">Important Safety Notice:</h3>
                    <ul className="text-red-800 space-y-2">
                      <li>• RideYaari is not responsible for your safety or the outcome of services arranged through our platform</li>
                      <li>• We do not conduct background checks on users</li>
                      <li>• All interactions and transactions are between users directly</li>
                      <li>• Users assume all risks associated with meeting and interacting with other users</li>
                      <li>• We strongly recommend meeting in public places and informing trusted contacts of your plans</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <p className="text-red-900 font-medium">Limitation of Liability:</p>
                    <p className="text-red-800 text-sm">
                      RideYaari, its officers, directors, employees, and agents shall not be liable for any direct, 
                      indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Payment and Pricing</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
                  <ul className="text-yellow-800 space-y-2">
                    <li>• RideYaari is free to use for all users</li>
                    <li>• Any payments for services are made directly between users</li>
                    <li>• We do not process payments or take commissions</li>
                    <li>• Users are responsible for agreeing on payment terms and methods</li>
                    <li>• Pricing disputes should be resolved directly between users</li>
                    <li>• We recommend discussing payment terms before meeting</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Prohibited Activities</h2>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-4">
                  <p className="text-orange-800 mb-3">The following activities are strictly prohibited:</p>
                  <ul className="text-orange-800 space-y-2">
                    <li>• Using the platform for illegal activities</li>
                    <li>• Transporting illegal substances or contraband</li>
                    <li>• Harassment, discrimination, or inappropriate behavior</li>
                    <li>• Creating fake profiles or providing false information</li>
                    <li>• Spamming or sending unsolicited commercial messages</li>
                    <li>• Attempting to circumvent platform security measures</li>
                    <li>• Using the platform for commercial transportation services without proper licensing</li>
                    <li>• Violating any local, state, or federal laws</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Account Termination</h2>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-4">
                  <p className="text-indigo-800 mb-3">
                    We reserve the right to suspend or terminate your account if you:
                  </p>
                  <ul className="text-indigo-800 space-y-2">
                    <li>• Violate these Terms of Service</li>
                    <li>• Engage in prohibited activities</li>
                    <li>• Receive multiple user complaints</li>
                    <li>• Provide false or misleading information</li>
                    <li>• Use the platform in a way that harms other users or the platform</li>
                  </ul>
                  <p className="text-indigo-800 mt-3">
                    You may also delete your account at any time through your profile settings.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-4">
                  <ul className="text-teal-800 space-y-2">
                    <li>• RideYaari and its content are protected by copyright and other intellectual property laws</li>
                    <li>• You may not copy, modify, distribute, or create derivative works of our platform</li>
                    <li>• User-generated content remains the property of the respective users</li>
                    <li>• By posting content, you grant us a license to use it for platform operations</li>
                    <li>• You are responsible for ensuring you have rights to any content you post</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe size={24} className="text-blue-600 mr-3" />
                  9. Governing Law
                </h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
                  <p className="text-blue-800">
                    These Terms of Service are governed by and construed in accordance with the laws of India. 
                    Any disputes arising from these terms or your use of RideYaari will be subject to the 
                    exclusive jurisdiction of the courts in India.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
                  <p className="text-gray-800">
                    We reserve the right to modify these Terms of Service at any time. We will notify users of 
                    material changes by posting the updated terms on our platform and updating the "Last updated" date. 
                    Your continued use of RideYaari after changes constitutes acceptance of the new terms.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Gavel size={24} className="text-purple-600 mr-3" />
                  11. Dispute Resolution
                </h2>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-4">
                  <ul className="text-purple-800 space-y-2">
                    <li>• Disputes between users should be resolved directly between the parties involved</li>
                    <li>• RideYaari may provide assistance in facilitating communication but is not obligated to resolve disputes</li>
                    <li>• For disputes with RideYaari, we encourage contacting our support team first</li>
                    <li>• If resolution cannot be reached, disputes will be subject to binding arbitration in India</li>
                    <li>• Class action lawsuits are waived in favor of individual arbitration</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <p className="text-green-800 mb-4">
                    If you have any questions about these Terms of Service, please contact us:
                  </p>
                  <div className="space-y-2 text-green-800">
                    <p><strong>Email:</strong> legal@rideyaari.com</p>
                    <p><strong>Support:</strong> support@rideyaari.com</p>
                    <p><strong>WhatsApp:</strong> +917093203981</p>
                    <p><strong>Address:</strong> RideYaari Legal Team, India</p>
                  </div>
                </div>
              </section>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
                <p className="text-yellow-800 text-center font-medium">
                  By using RideYaari, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}