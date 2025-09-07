import React from 'react'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

export function CheckoutCancel() {
  const handleReturnHome = () => {
    window.location.href = '/'
  }

  const handleTryAgain = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        {/* Cancel Icon */}
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-500/40">
          <XCircle className="w-10 h-10 text-red-400" />
        </div>

        {/* Cancel Message */}
        <h1 className="text-3xl font-bold text-white mb-4 font-poppins">
          Payment Cancelled
        </h1>
        <p className="text-gray-300 mb-8">
          Your payment was cancelled. No charges have been made to your account.
        </p>

        {/* Information Box */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8 text-left">
          <h3 className="text-lg font-semibold text-white mb-4">What happened?</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              You cancelled the payment process
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              No charges were made to your payment method
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Your account remains unchanged
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button 
            onClick={handleTryAgain}
            className="w-full bg-[#FFC107] hover:bg-[#FFB300] text-black py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </Button>
          
          <Button 
            onClick={handleReturnHome}
            className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-medium border border-white/20 flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@talentbook.com" className="text-[#FFC107] hover:text-[#FFB300]">
              support@talentbook.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}