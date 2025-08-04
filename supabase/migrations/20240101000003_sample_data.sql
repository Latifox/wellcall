-- Insert sample clients for testing
INSERT INTO public.clients (id, company_name, email, workspace_id, workspace_api_key, plan) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Acme Corp', 'admin@acme.com', 'ws_acme_123', encode(encrypt('sk_test_acme_api_key_123'::bytea, 'wellcall_secret_key', 'aes'), 'base64'), 'pro'),
    ('550e8400-e29b-41d4-a716-446655440002', 'TechStart Inc', 'contact@techstart.com', 'ws_tech_456', encode(encrypt('sk_test_tech_api_key_456'::bytea, 'wellcall_secret_key', 'aes'), 'base64'), 'starter'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Enterprise Solutions', 'info@enterprise.com', 'ws_ent_789', encode(encrypt('sk_test_ent_api_key_789'::bytea, 'wellcall_secret_key', 'aes'), 'base64'), 'enterprise');

-- Insert sample usage cache data
INSERT INTO public.usage_cache (client_id, month, calls_count, minutes_used, revenue) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '2024-01', 150, 2250, 450.00),
    ('550e8400-e29b-41d4-a716-446655440001', '2024-02', 180, 2700, 540.00),
    ('550e8400-e29b-41d4-a716-446655440002', '2024-01', 75, 1125, 112.50),
    ('550e8400-e29b-41d4-a716-446655440002', '2024-02', 90, 1350, 135.00),
    ('550e8400-e29b-41d4-a716-446655440003', '2024-01', 300, 4500, 1350.00),
    ('550e8400-e29b-41d4-a716-446655440003', '2024-02', 350, 5250, 1575.00);

-- Note: Sample users will be created automatically when they sign up via Supabase Auth
-- The trigger will handle creating the user record in the users table