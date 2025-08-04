-- Enable Row Level Security on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_cache ENABLE ROW LEVEL SECURITY;

-- Clients table policies
-- Admins can see all clients, clients can only see their own record
CREATE POLICY "Admins can view all clients" ON public.clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Clients can view their own record" ON public.clients
    FOR SELECT USING (
        id = (
            SELECT client_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Admins can insert/update/delete clients
CREATE POLICY "Admins can insert clients" ON public.clients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update clients" ON public.clients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete clients" ON public.clients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users table policies
-- Users can view their own record, admins can view all
CREATE POLICY "Users can view their own record" ON public.users
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u2
            WHERE u2.auth_user_id = auth.uid() AND u2.role = 'admin'
        )
    );

-- Only admins can insert/update/delete users
CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u2
            WHERE u2.auth_user_id = auth.uid() AND u2.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users u2
            WHERE u2.auth_user_id = auth.uid() AND u2.role = 'admin'
        )
    );

-- Usage cache table policies
-- Clients can only see their own usage data, admins can see all
CREATE POLICY "Clients can view their own usage" ON public.usage_cache
    FOR SELECT USING (
        client_id = (
            SELECT client_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all usage" ON public.usage_cache
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins and edge functions can insert/update usage cache
CREATE POLICY "Admins can insert usage cache" ON public.usage_cache
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update usage cache" ON public.usage_cache
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a new user record when someone signs up
    INSERT INTO public.users (auth_user_id, role)
    VALUES (NEW.id, 'client'); -- Default role is client
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;