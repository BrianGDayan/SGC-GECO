-- 1. EXTENSIONES Y LIMPIEZA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE USUARIOS (Sustituye a profiles y user_roles)
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    auth_id UUID UNIQUE NOT NULL, -- Vínculo con Supabase Auth
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'lector' CHECK (role IN ('editor', 'lector', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA DE DOCUMENTOS (Simplificada)
CREATE TABLE public.documents (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE, -- Se puede generar por trigger o manual
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    revision INTEGER DEFAULT 0,
    status TEXT DEFAULT 'en revision',
    file_url TEXT,
    file_name TEXT,
    uploaded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA DE INDICADORES (Simplificada)
CREATE TABLE public.indicators (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    target_value NUMERIC NOT NULL,
    current_value NUMERIC DEFAULT 0,
    unit TEXT DEFAULT '%',
    responsible_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA DE PROCESOS (Simplificada)
CREATE TABLE public.processes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    compliance_percentage NUMERIC DEFAULT 0,
    owner_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLA DE AUDITORÍAS (Simplificada)
CREATE TABLE public.audits (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    status TEXT DEFAULT 'programada',
    auditor_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TRIGGER: CREACIÓN AUTOMÁTICA DE USUARIO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), 
    'lector' -- Rol por defecto
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. POLÍTICAS RLS (Seguridad Robusta pero sencilla)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Lectura: Todos los autenticados pueden ver todo
CREATE POLICY "Select_All" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Select_All" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Select_All" ON public.indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Select_All" ON public.processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Select_All" ON public.audits FOR SELECT TO authenticated USING (true);

-- Escritura: Solo usuarios con rol 'editor' o 'admin'
CREATE POLICY "Editor_Insert_Docs" ON public.documents FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('editor', 'admin')));

CREATE POLICY "Editor_Update_Docs" ON public.documents FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('editor', 'admin')));

CREATE POLICY "Admin_Delete_Docs" ON public.documents FOR DELETE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin'));

-- 9. STORAGE BUCKET
-- (Ejecutar esto para crear el bucket si no lo has hecho manualmente)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Storage_Select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Storage_Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Storage_Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');