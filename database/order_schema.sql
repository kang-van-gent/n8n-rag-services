-- Order Management Schema for n8n Bot Integration
-- This schema allows the n8n bot to create and manage orders in Supabase

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Order details
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    
    -- Financial information
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Customer information
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    
    -- Shipping address
    shipping_address_line1 VARCHAR(255),
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100),
    
    -- Billing address (optional, can be same as shipping)
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100),
    
    -- Order metadata
    notes TEXT,
    source VARCHAR(50) DEFAULT 'n8n_bot', -- Track order source
    external_order_id VARCHAR(255), -- For integration with external systems
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    
    -- Product information
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    product_description TEXT,
    
    -- Pricing and quantity
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    line_total DECIMAL(10,2) NOT NULL, -- unit_price * quantity
    
    -- Product metadata
    product_image_url TEXT,
    product_category VARCHAR(100),
    product_weight DECIMAL(8,2), -- in kg
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order status history table (for tracking status changes)
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    
    -- Status change information
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    changed_by VARCHAR(255) DEFAULT 'n8n_bot', -- Who/what changed the status
    reason TEXT, -- Optional reason for status change
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment information table
CREATE TABLE IF NOT EXISTS public.order_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    
    -- Payment details
    payment_method VARCHAR(50) NOT NULL, -- 'credit_card', 'paypal', 'bank_transfer', etc.
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded', 'cancelled')),
    
    -- Payment amounts
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment processor information
    payment_processor VARCHAR(50), -- 'stripe', 'paypal', 'square', etc.
    transaction_id VARCHAR(255), -- External transaction ID
    processor_response TEXT, -- Raw response from payment processor
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE
);

-- Order tracking table (for shipping tracking)
CREATE TABLE IF NOT EXISTS public.order_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    
    -- Tracking information
    tracking_number VARCHAR(255) NOT NULL,
    carrier VARCHAR(100) NOT NULL, -- 'UPS', 'FedEx', 'USPS', 'DHL', etc.
    tracking_url TEXT,
    
    -- Shipping details
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_sku ON public.order_items(product_sku);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON public.order_status_history(created_at);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_payment_status ON public.order_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_payments_transaction_id ON public.order_payments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON public.order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_tracking_number ON public.order_tracking(tracking_number);

-- RLS (Row Level Security) policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all orders (for n8n bot)
CREATE POLICY "Service role can manage all orders" ON public.orders
    FOR ALL USING (auth.role() = 'service_role');

-- Order items policies
CREATE POLICY "Users can view their order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all order items" ON public.order_items
    FOR ALL USING (auth.role() = 'service_role');

-- Order status history policies
CREATE POLICY "Users can view their order status history" ON public.order_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_status_history.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all order status history" ON public.order_status_history
    FOR ALL USING (auth.role() = 'service_role');

-- Order payments policies
CREATE POLICY "Users can view their order payments" ON public.order_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_payments.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all order payments" ON public.order_payments
    FOR ALL USING (auth.role() = 'service_role');

-- Order tracking policies
CREATE POLICY "Users can view their order tracking" ON public.order_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_tracking.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all order tracking" ON public.order_tracking
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for order management

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'ORD';
    timestamp_part TEXT;
    random_part TEXT;
    order_number TEXT;
BEGIN
    -- Get current timestamp in YYYYMMDD format
    timestamp_part := to_char(NOW(), 'YYYYMMDD');
    
    -- Generate random 4-digit number
    random_part := LPAD(floor(random() * 10000)::text, 4, '0');
    
    -- Combine parts
    order_number := prefix || '-' || timestamp_part || '-' || random_part;
    
    -- Check if order number already exists, if so, try again
    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_number = order_number) LOOP
        random_part := LPAD(floor(random() * 10000)::text, 4, '0');
        order_number := prefix || '-' || timestamp_part || '-' || random_part;
    END LOOP;
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update order total when items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.orders 
    SET subtotal = (
        SELECT COALESCE(SUM(line_total), 0) 
        FROM public.order_items 
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    total_amount = subtotal + tax_amount + shipping_cost - discount_amount,
    updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update order totals
DROP TRIGGER IF EXISTS trigger_update_order_total ON public.order_items;
CREATE TRIGGER trigger_update_order_total
    AFTER INSERT OR UPDATE OR DELETE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, reason)
        VALUES (NEW.id, OLD.status, NEW.status, 'system', 'Status updated');
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-log status changes
DROP TRIGGER IF EXISTS trigger_log_order_status_change ON public.orders;
CREATE TRIGGER trigger_log_order_status_change
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_status_change();

-- Function to set line_total for order items
CREATE OR REPLACE FUNCTION set_order_item_line_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.line_total = NEW.unit_price * NEW.quantity;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate line totals
DROP TRIGGER IF EXISTS trigger_set_order_item_line_total ON public.order_items;
CREATE TRIGGER trigger_set_order_item_line_total
    BEFORE INSERT OR UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION set_order_item_line_total();

-- Insert some sample data for testing (optional)
/*
INSERT INTO public.orders (
    user_id, order_number, customer_name, customer_email, 
    subtotal, tax_amount, shipping_cost, total_amount,
    status, source, notes
) VALUES (
    -- Replace with actual user UUID for testing
    'your-test-user-id-here',
    generate_order_number(),
    'Test Customer',
    'test@example.com',
    100.00,
    8.00,
    10.00,
    118.00,
    'confirmed',
    'n8n_bot',
    'Test order created by n8n bot'
);
*/

-- Comments for documentation
COMMENT ON TABLE public.orders IS 'Main orders table for storing customer orders created by n8n bot';
COMMENT ON TABLE public.order_items IS 'Individual items within each order';
COMMENT ON TABLE public.order_status_history IS 'Audit trail for order status changes';
COMMENT ON TABLE public.order_payments IS 'Payment information and transaction records';
COMMENT ON TABLE public.order_tracking IS 'Shipping and tracking information';

COMMENT ON COLUMN public.orders.source IS 'Source of the order (n8n_bot, web_app, mobile_app, etc.)';
COMMENT ON COLUMN public.orders.external_order_id IS 'Reference ID from external systems for integration';
COMMENT ON FUNCTION generate_order_number() IS 'Generates unique order numbers in format ORD-YYYYMMDD-XXXX';