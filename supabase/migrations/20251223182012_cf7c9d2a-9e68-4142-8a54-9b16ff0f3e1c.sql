-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'auditor', 'editor', 'colaborador');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'colaborador',
  UNIQUE (user_id, role)
);

-- Create document categories enum
CREATE TYPE public.document_category AS ENUM ('manual', 'procedimiento', 'instructivo', 'registro', 'formato', 'politica', 'otro');

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category document_category NOT NULL DEFAULT 'otro',
  version TEXT NOT NULL DEFAULT '1.0',
  file_url TEXT,
  file_name TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create indicators table
CREATE TABLE public.indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',
  frequency TEXT NOT NULL DEFAULT 'mensual',
  responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indicator_records table for historical data
CREATE TABLE public.indicator_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID REFERENCES public.indicators(id) ON DELETE CASCADE NOT NULL,
  value NUMERIC NOT NULL,
  period TEXT NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create processes table
CREATE TABLE public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  process_type TEXT NOT NULL DEFAULT 'operativo',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  compliance_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audits table
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  audit_type TEXT NOT NULL DEFAULT 'interna',
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'programada',
  auditor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  findings_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any elevated role
CREATE OR REPLACE FUNCTION public.has_elevated_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'auditor', 'editor')
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles (only admins can manage)
CREATE POLICY "Users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for documents
CREATE POLICY "All authenticated can view documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Elevated roles can insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.has_elevated_role(auth.uid()));
CREATE POLICY "Elevated roles can update documents" ON public.documents FOR UPDATE TO authenticated USING (public.has_elevated_role(auth.uid()));
CREATE POLICY "Admins can delete documents" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for indicators
CREATE POLICY "All authenticated can view indicators" ON public.indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Elevated roles can insert indicators" ON public.indicators FOR INSERT TO authenticated WITH CHECK (public.has_elevated_role(auth.uid()));
CREATE POLICY "Elevated roles can update indicators" ON public.indicators FOR UPDATE TO authenticated USING (public.has_elevated_role(auth.uid()));
CREATE POLICY "Admins can delete indicators" ON public.indicators FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for indicator_records
CREATE POLICY "All authenticated can view records" ON public.indicator_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated can insert records" ON public.indicator_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own records" ON public.indicator_records FOR UPDATE TO authenticated USING (recorded_by = auth.uid() OR public.has_elevated_role(auth.uid()));

-- RLS Policies for processes
CREATE POLICY "All authenticated can view processes" ON public.processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Elevated roles can manage processes" ON public.processes FOR ALL TO authenticated USING (public.has_elevated_role(auth.uid()));

-- RLS Policies for audits
CREATE POLICY "All authenticated can view audits" ON public.audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auditors and admins can manage audits" ON public.audits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor'));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'colaborador');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_indicators_updated_at BEFORE UPDATE ON public.indicators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON public.audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Storage policies
CREATE POLICY "Authenticated users can view documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Elevated roles can upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND public.has_elevated_role(auth.uid()));
CREATE POLICY "Elevated roles can update documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents' AND public.has_elevated_role(auth.uid()));
CREATE POLICY "Admins can delete documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));