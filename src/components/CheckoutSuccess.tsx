import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { supabase } from '../lib/supabase'

export function CheckoutSuccess() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderDetails, setOrderDetails] = useState<any>(null)
  
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      // Give the webhook some time to process
      setTimeout(() => {
        fetchOrderDetails()
      }, 2000)
    } else {
      setError('No session ID found')
      setLoading(false)
    }
  }, [sessionId])

  const fetchOrderDetails = async () => {
    try {
      // Try to fetch order details from our database
      const { data: orders, error: ordersError } = await supabase
        .from('stripe_orders')
        .select('*')
        .eq('checkout_session_id', sessionId)
        .maybeSingle()

      if (ordersError) {
        console.error('Error fetching order:', ordersError)
      }

      // Also check for subscription updates
      const { data: { user } } = await supabase.auth.getUser()

      let subscription = null
      if (user) {
        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .maybeSingle()

        if (customer) {
          const { data: sub, error: subError } = await supabase
            .from('stripe_subscriptions')
            .select('*')
            .eq('customer_id', customer.customer_id)
            .maybeSingle()

          if (subError) {
            console.error('Error fetching subscription:', subError)
          } else {
            subscription = sub
          }
        }
      }

      setOrderDetails({
        order: orders,
        subscription: subscription
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReturnHome = () => {
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#FFC107] animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Processing your payment...</h2>
          <p className="text-gray-300">Please wait while we confirm your purchase.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Button onClick={handleReturnHome} className="bg-[#FFC107] hover:bg-[#FFB300] text-black">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500/40">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-white mb-4 font-poppins">
          Payment Successful!
        </h1>
        <p className="text-gray-300 mb-8">
          Thank you for your purchase. Your payment has been processed successfully.
        </p>

        {/* Order Details */}
        {orderDetails?.order && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8 text-left">
            <h3 className="text-lg font-semibold text-white mb-4">Order Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white font-medium">
                  €{(orderDetails.order.amount_total / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Status:</span>
                <span className="text-green-400 font-medium capitalize">
                  {orderDetails.order.payment_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Order Date:</span>
                <span className="text-white">
                  {new Date(orderDetails.order.order_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Details */}
        {orderDetails?.subscription && orderDetails.subscription.status === 'active' && (
          <div className="bg-[#FFC107]/10 backdrop-blur-sm rounded-xl p-6 border border-[#FFC107]/20 mb-8 text-left">
            <h3 className="text-lg font-semibold text-white mb-4">Subscription Active</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-[#FFC107] font-medium capitalize">
                  {orderDetails.subscription.status}
                </span>
              </div>
              {orderDetails.subscription.current_period_end && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Next Billing:</span>
                  <span className="text-white">
                    {new Date(orderDetails.subscription.current_period_end * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button 
            onClick={handleReturnHome}
            className="w-full bg-[#FFC107] hover:bg-[#FFB300] text-black py-3 rounded-lg font-semibold transition-all duration-200"
          >
            Continue to Dashboard
          </Button>
          
          <Button 
            onClick={() => window.print()}
            className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-medium border border-white/20"
          >
            Print Receipt
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            Questions about your purchase? Contact our support team at{' '}
            <a href="mailto:support@talentbook.com" className="text-[#FFC107] hover:text-[#FFB300]">
              support@talentbook.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}