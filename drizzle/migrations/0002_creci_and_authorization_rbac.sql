-- 1. CRECI do corretor
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creci text;

-- 2. RBAC das fichas: corretor só edita ficha pendente e nunca deleta
DROP POLICY IF EXISTS "Brokers manage own authorizations" ON public.authorizations;

CREATE POLICY "Brokers read own authorizations"
ON public.authorizations FOR SELECT TO authenticated
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers create own authorizations"
ON public.authorizations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = broker_id);

-- update permitido apenas enquanto pendente (linha antiga e nova)
CREATE POLICY "Brokers update own pending authorizations"
ON public.authorizations FOR UPDATE TO authenticated
USING (auth.uid() = broker_id AND status = 'pendente'::authorization_status)
WITH CHECK (auth.uid() = broker_id AND status = 'pendente'::authorization_status);

-- admins podem atualizar qualquer ficha
CREATE POLICY "Admins update any authorization"
ON public.authorizations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- delete: somente admin (política de admin já existe); nenhuma política de delete para corretor
