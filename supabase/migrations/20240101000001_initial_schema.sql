-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    workspace_id TEXT NOT NULL,
    workspace_api_key TEXT NOT NULL, -- encrypted
    plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'enterprise')) DEFAULT 'starter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'client')) DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(auth_user_id)
);

-- Create usage_cache table for analytics caching
CREATE TABLE public.usage_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- Format: YYYY-MM
    calls_count INTEGER DEFAULT 0,
    minutes_used INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, month)
);

-- Create indexes for better performance
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_client_id ON public.users(client_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_usage_cache_client_id ON public.usage_cache(client_id);
CREATE INDEX idx_usage_cache_month ON public.usage_cache(month);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_usage_cache_updated_at
    BEFORE UPDATE ON public.usage_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to encrypt API keys
CREATE OR REPLACE FUNCTION public.encrypt_api_key(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(api_key::bytea, 'wellcall_secret_key', 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt API keys (for Edge Functions only)
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(decode(encrypted_key, 'base64'), 'wellcall_secret_key', 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's client_id
CREATE OR REPLACE FUNCTION public.get_current_client_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT client_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM public.users 
        WHERE auth_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;