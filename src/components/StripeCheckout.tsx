import React, { useState } from 'react'
import { Button } from './ui/button'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface StripeProduct {
  id: string
  priceId: string
  name: string
  description: string
  mode: 'payment' | 'subscription'
  price: number // in cents
  currency: string
  category: string
  popular?: boolean
}

interface StripeCheckoutProps {
  product: StripeProduct
  onError?: (error: string) => void
  onAuthRequired?: () => void
  successUrl?: string
  cancelUrl?: string
  className?: string
  children?: React.ReactNode
}

export function StripeCheckout({ product, onError, onAuthRequired, successUrl, cancelUrl, className, children }: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)
    
    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        if (onAuthRequired) {
          onAuthRequired()
          return
        } else {
          throw new Error('Please log in to continue with checkout')
        }
      }

      // Create checkout session via edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: product.priceId,
          mode: product.mode,
          success_url: successUrl || `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl || `${window.location.origin}/checkout/cancel`,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      if (onError) {
        onError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Processing...
        </>
      ) : (
        children || `Purchase ${product.name}`
      )}
    </Button>
  )
}