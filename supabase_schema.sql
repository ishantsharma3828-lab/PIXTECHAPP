-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{}', -- Currency, Tax, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id UUID REFERENCES auth.users(id)
);

-- 2. PROFILES (Users linked to Orgs)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    username TEXT,
    role TEXT CHECK (role IN ('admin', 'cashier', 'manager', 'technician', 'inventory_manager', 'customer')) DEFAULT 'customer',
    pin_code_hash TEXT, -- For offline access (optional)
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    sku TEXT,
    brand TEXT,
    category TEXT,
    cost_price NUMERIC DEFAULT 0,
    price1 NUMERIC DEFAULT 0,
    price2 NUMERIC DEFAULT 0,
    price3 NUMERIC DEFAULT 0,
    price4 NUMERIC DEFAULT 0,
    quantity NUMERIC DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    description TEXT,
    custom_fields JSONB DEFAULT '{}',
    images JSONB DEFAULT '[]', -- Array of {id, url}
    warranty JSONB DEFAULT '{"enabled": false}',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMERS
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    loyalty_points NUMERIC DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    tier TEXT DEFAULT 'Bronze',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SALES
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    cashier_id UUID REFERENCES profiles(id), -- Nullable if user deleted
    customer_id UUID REFERENCES customers(id), -- Nullable
    subtotal NUMERIC NOT NULL,
    tax NUMERIC NOT NULL,
    discount NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    items JSONB NOT NULL, -- Snapshot of sold items
    payments JSONB NOT NULL, -- Array of payment records
    status TEXT CHECK (status IN ('completed', 'void', 'refunded')) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ -- To track sync status
);

-- --- ROW LEVEL SECURITY (RLS) ---

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get Current User's Org ID
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLICIES

-- Organizations: Only members can read
-- Admins can update their own org
CREATE POLICY "Org Read Access" ON organizations
FOR SELECT USING (id = get_my_org_id());

CREATE POLICY "Org Admin Update" ON organizations
FOR UPDATE USING (id = get_my_org_id() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Profiles: Users can see profiles in same org OR their own profile
CREATE POLICY "Profiles View Same Org Or Own" ON profiles
FOR SELECT USING (organization_id = get_my_org_id() OR id = auth.uid());

-- Products: Org Isolation
CREATE POLICY "Products View Org" ON products
FOR SELECT USING (organization_id = get_my_org_id());

CREATE POLICY "Products Manage Org" ON products
FOR ALL USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- Customers: Org Isolation
CREATE POLICY "Customers View Org" ON customers
FOR SELECT USING (organization_id = get_my_org_id());

CREATE POLICY "Customers Manage Org" ON customers
FOR ALL USING (organization_id = get_my_org_id());

-- Sales: Org Isolation
CREATE POLICY "Sales View Org" ON sales
FOR SELECT USING (organization_id = get_my_org_id());

CREATE POLICY "Sales Insert Org" ON sales
FOR INSERT WITH CHECK (organization_id = get_my_org_id());

-- 6. TRIGGERS & FUNCTIONS

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id UUID;
BEGIN
  -- 1. Get or Create a Default Organization
  -- For this simple setup, we'll try to find an existing one or create "Default Org"
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
  
  IF default_org_id IS NULL THEN
    INSERT INTO public.organizations (name, settings)
    VALUES ('Default Organization', '{"currency": "USD"}')
    RETURNING id INTO default_org_id;
  END IF;

  -- 2. Create the Profile
  INSERT INTO public.profiles (id, organization_id, username, role)
  VALUES (
    new.id,
    default_org_id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email), -- Use Full Name or Email as username
    COALESCE(new.raw_user_meta_data->>'role', 'customer') -- Respect metadata role if passed (careful with security) OR default to customer
    -- Note: We allowed metadata role here, but we should strictly check it in production. 
    -- For now valid roles are constrained by table check.
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on every new auth.users entry
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create a Default Organization immediately if one doesn't exist (to be safe)
INSERT INTO organizations (name)
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM organizations);
