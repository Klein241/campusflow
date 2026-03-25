-- ============================================================
-- CAMPUSFLOW — Bibliothèque, Marketplace, Chat (org-scoped)
-- V2: avec tables auxiliaires complètes
-- ============================================================

-- 1. LIBRARY (Bibliothèque numérique)
CREATE TABLE IF NOT EXISTS public.library_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    file_url        TEXT,
    file_type       TEXT DEFAULT 'pdf' CHECK (file_type IN ('pdf','doc','video','audio','image','link','other')),
    file_size       BIGINT DEFAULT 0,
    category        TEXT DEFAULT 'general',
    subject_id      UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
    uploaded_by     UUID REFERENCES auth.users(id),
    download_count  INTEGER DEFAULT 0,
    is_public       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_library_org ON public.library_items(organization_id);

-- Library favorites
CREATE TABLE IF NOT EXISTS public.library_favorites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id         UUID NOT NULL REFERENCES public.library_items(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, user_id)
);

-- Library reading history
CREATE TABLE IF NOT EXISTS public.library_reading_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id         UUID NOT NULL REFERENCES public.library_items(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, user_id)
);

-- 2. MARKETPLACE (Boutique établissement)
CREATE TABLE IF NOT EXISTS public.marketplace_products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    price           NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency        TEXT DEFAULT 'XAF',
    category        TEXT DEFAULT 'fourniture' CHECK (category IN ('fourniture','uniforme','livre','cours_payant','materiel','alimentaire','electronique','autre')),
    image_url       TEXT,
    stock           INTEGER DEFAULT 0,
    is_available    BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_org ON public.marketplace_products(organization_id);

-- Marketplace favorites
CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
    buyer_id        UUID NOT NULL REFERENCES auth.users(id),
    quantity        INTEGER DEFAULT 1,
    total_amount    NUMERIC(12,2) NOT NULL,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','delivered','cancelled')),
    payment_method  TEXT DEFAULT 'cash',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CHAT (Messages org-scoped)
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type            TEXT DEFAULT 'direct' CHECK (type IN ('direct','group','class','announcement')),
    name            TEXT,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_conv_org ON public.chat_conversations(organization_id);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            TEXT DEFAULT 'member' CHECK (role IN ('admin','member')),
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    msg_type        TEXT DEFAULT 'text' CHECK (msg_type IN ('text','image','file','audio','system')),
    media_url       TEXT,
    is_read         BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_msgs_conv ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msgs_time ON public.chat_messages(created_at DESC);

-- ═══ RLS ═══
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Library: public read, owner or uploader write
DROP POLICY IF EXISTS "library_read" ON public.library_items;
CREATE POLICY "library_read" ON public.library_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "library_write" ON public.library_items;
CREATE POLICY "library_write" ON public.library_items FOR ALL TO authenticated USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.organizations WHERE id = library_items.organization_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "library_insert" ON public.library_items;
CREATE POLICY "library_insert" ON public.library_items FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = library_items.organization_id AND owner_id = auth.uid())
    OR uploaded_by = auth.uid()
);

-- Library favorites: user can manage own
DROP POLICY IF EXISTS "lib_fav_all" ON public.library_favorites;
CREATE POLICY "lib_fav_all" ON public.library_favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Library reading history: user can manage own
DROP POLICY IF EXISTS "lib_hist_all" ON public.library_reading_history;
CREATE POLICY "lib_hist_all" ON public.library_reading_history FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Marketplace: public read, owner write
DROP POLICY IF EXISTS "marketplace_read" ON public.marketplace_products;
CREATE POLICY "marketplace_read" ON public.marketplace_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "marketplace_write" ON public.marketplace_products;
CREATE POLICY "marketplace_write" ON public.marketplace_products FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = marketplace_products.organization_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "marketplace_insert" ON public.marketplace_products;
CREATE POLICY "marketplace_insert" ON public.marketplace_products FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = marketplace_products.organization_id AND owner_id = auth.uid())
);

-- Marketplace favorites: user can manage own
DROP POLICY IF EXISTS "mp_fav_all" ON public.marketplace_favorites;
CREATE POLICY "mp_fav_all" ON public.marketplace_favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Orders: buyer sees own, admin sees all org
DROP POLICY IF EXISTS "orders_read" ON public.marketplace_orders;
CREATE POLICY "orders_read" ON public.marketplace_orders FOR SELECT TO authenticated USING (
    buyer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.organizations WHERE id = marketplace_orders.organization_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "orders_insert" ON public.marketplace_orders;
CREATE POLICY "orders_insert" ON public.marketplace_orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

-- Orders: admin can update status
DROP POLICY IF EXISTS "orders_update" ON public.marketplace_orders;
CREATE POLICY "orders_update" ON public.marketplace_orders FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = marketplace_orders.organization_id AND owner_id = auth.uid())
);

-- Chat: participants can read/write
DROP POLICY IF EXISTS "conv_read" ON public.chat_conversations;
CREATE POLICY "conv_read" ON public.chat_conversations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE conversation_id = chat_conversations.id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.organizations WHERE id = chat_conversations.organization_id AND owner_id = auth.uid())
);
DROP POLICY IF EXISTS "conv_insert" ON public.chat_conversations;
CREATE POLICY "conv_insert" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "conv_delete" ON public.chat_conversations;
CREATE POLICY "conv_delete" ON public.chat_conversations FOR DELETE TO authenticated USING (
    created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.organizations WHERE id = chat_conversations.organization_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "part_read" ON public.chat_participants;
CREATE POLICY "part_read" ON public.chat_participants FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.conversation_id = chat_participants.conversation_id AND cp.user_id = auth.uid())
);
DROP POLICY IF EXISTS "part_insert" ON public.chat_participants;
CREATE POLICY "part_insert" ON public.chat_participants FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "part_delete" ON public.chat_participants;
CREATE POLICY "part_delete" ON public.chat_participants FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.conversation_id = chat_participants.conversation_id AND cp.user_id = auth.uid() AND cp.role = 'admin')
);

DROP POLICY IF EXISTS "msg_read" ON public.chat_messages;
CREATE POLICY "msg_read" ON public.chat_messages FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.chat_conversations c JOIN public.organizations o ON c.organization_id = o.id WHERE c.id = chat_messages.conversation_id AND o.owner_id = auth.uid())
);
DROP POLICY IF EXISTS "msg_insert" ON public.chat_messages;
CREATE POLICY "msg_insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "msg_update" ON public.chat_messages;
CREATE POLICY "msg_update" ON public.chat_messages FOR UPDATE TO authenticated USING (
    sender_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.chat_participants WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "msg_delete" ON public.chat_messages;
CREATE POLICY "msg_delete" ON public.chat_messages FOR DELETE TO authenticated USING (
    sender_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.conversation_id = chat_messages.conversation_id AND cp.user_id = auth.uid() AND cp.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.chat_conversations c JOIN public.organizations o ON c.organization_id = o.id WHERE c.id = chat_messages.conversation_id AND o.owner_id = auth.uid())
);

-- Realtime for chat
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
