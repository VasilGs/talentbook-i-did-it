/*
  # Create Stripe Payment Tables

  ## Overview
  Creates three tables to track Stripe payment data:
  - stripe_customers: Maps Supabase users to Stripe customer IDs
  - stripe_subscriptions: Tracks subscription statuses and billing details
  - stripe_orders: Records one-time payment transactions

  ## New Tables

  ### stripe_customers
  - `id` (uuid, primary key) - Internal record ID
  - `created_at` (timestamptz) - When the customer was created
  - `updated_at` (timestamptz) - Auto-updated timestamp
  - `deleted_at` (timestamptz) - Soft delete timestamp
  - `user_id` (uuid, foreign key) - References auth.users
  - `customer_id` (text, unique) - Stripe customer ID

  ### stripe_subscriptions
  - `id` (uuid, primary key) - Internal record ID
  - `created_at` (timestamptz) - When the subscription was created
  - `updated_at` (timestamptz) - Auto-updated timestamp
  - `customer_id` (text, unique) - Stripe customer ID
  - `subscription_id` (text) - Stripe subscription ID
  - `price_id` (text) - Stripe price ID
  - `status` (text) - Subscription status
  - `current_period_start` (integer) - Unix timestamp
  - `current_period_end` (integer) - Unix timestamp
  - `cancel_at_period_end` (boolean) - Whether subscription will cancel
  - `payment_method_brand` (text) - Card brand (e.g., 'visa')
  - `payment_method_last4` (text) - Last 4 digits of card

  ### stripe_orders
  - `id` (uuid, primary key) - Internal record ID
  - `created_at` (timestamptz) - When the order was created
  - `checkout_session_id` (text, unique) - Stripe checkout session ID
  - `payment_intent_id` (text) - Stripe payment intent ID
  - `customer_id` (text) - Stripe customer ID
  - `amount_subtotal` (bigint) - Amount before tax in cents
  - `amount_total` (bigint) - Total amount in cents
  - `currency` (text) - Currency code (e.g., 'eur')
  - `payment_status` (text) - Payment status
  - `status` (text) - Order status

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only view their own payment records
  - Policies check user_id or customer_id ownership

  ## Indexes
  - Performance indexes on foreign keys and lookup fields
  - Unique indexes on Stripe IDs to prevent duplicates
*/

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  CONSTRAINT stripe_customers_customer_id_key UNIQUE (customer_id)
);

-- Create stripe_subscriptions table
CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  customer_id TEXT NOT NULL,
  subscription_id TEXT,
  price_id TEXT,
  status TEXT DEFAULT 'not_started',
  current_period_start INTEGER,
  current_period_end INTEGER,
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_method_brand TEXT,
  payment_method_last4 TEXT,
  CONSTRAINT stripe_subscriptions_customer_id_key UNIQUE (customer_id)
);

-- Create stripe_orders table
CREATE TABLE IF NOT EXISTS public.stripe_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  checkout_session_id TEXT NOT NULL,
  payment_intent_id TEXT,
  customer_id TEXT NOT NULL,
  amount_subtotal BIGINT,
  amount_total BIGINT,
  currency TEXT,
  payment_status TEXT,
  status TEXT,
  CONSTRAINT stripe_orders_checkout_session_id_key UNIQUE (checkout_session_id)
);

-- Create indexes for stripe_customers
CREATE INDEX IF NOT EXISTS stripe_customers_user_id_idx ON public.stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS stripe_customers_customer_id_idx ON public.stripe_customers(customer_id);
CREATE INDEX IF NOT EXISTS stripe_customers_deleted_at_idx ON public.stripe_customers(deleted_at);

-- Create indexes for stripe_subscriptions
CREATE INDEX IF NOT EXISTS stripe_subscriptions_customer_id_idx ON public.stripe_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS stripe_subscriptions_subscription_id_idx ON public.stripe_subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS stripe_subscriptions_status_idx ON public.stripe_subscriptions(status);

-- Create indexes for stripe_orders
CREATE INDEX IF NOT EXISTS stripe_orders_customer_id_idx ON public.stripe_orders(customer_id);
CREATE INDEX IF NOT EXISTS stripe_orders_checkout_session_id_idx ON public.stripe_orders(checkout_session_id);
CREATE INDEX IF NOT EXISTS stripe_orders_status_idx ON public.stripe_orders(status);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION handle_stripe_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stripe_customers
DROP TRIGGER IF EXISTS stripe_customers_updated_at ON public.stripe_customers;
CREATE TRIGGER stripe_customers_updated_at
  BEFORE UPDATE ON public.stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION handle_stripe_customers_updated_at();

-- Create trigger function for stripe_subscriptions updated_at
CREATE OR REPLACE FUNCTION handle_stripe_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stripe_subscriptions
DROP TRIGGER IF EXISTS stripe_subscriptions_updated_at ON public.stripe_subscriptions;
CREATE TRIGGER stripe_subscriptions_updated_at
  BEFORE UPDATE ON public.stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_stripe_subscriptions_updated_at();

-- Enable Row Level Security
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_customers

-- Users can view their own customer records
CREATE POLICY "Users can view their own customer records"
  ON public.stripe_customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own customer records (handled by edge function)
CREATE POLICY "Users can create their own customer records"
  ON public.stripe_customers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own customer records
CREATE POLICY "Users can update their own customer records"
  ON public.stripe_customers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stripe_subscriptions

-- Users can view their own subscription records
CREATE POLICY "Users can view their own subscription records"
  ON public.stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- RLS Policies for stripe_orders

-- Users can view their own order records
CREATE POLICY "Users can view their own order records"
  ON public.stripe_orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );