-- ============================================================
-- CAMPUSFLOW — SYSTÈME DE PAIEMENT CAMERPAY (Migration 069)
-- Architecture : 1 seul compte CamerPay (SuperAdmin)
--               Redistribution automatique via Mass Payout
-- ============================================================

-- ── TABLE: org_payout_config (coordonnées de paiement de chaque école) ──
-- L'admin d'école renseigne son numéro Mobile Money pour recevoir ses fonds.
-- C'est CampusFlow (SuperAdmin) qui détient le token CamerPay.
CREATE TABLE IF NOT EXISTS public.org_payout_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Coordonnées de paiement de l'école (pour les virements automatiques)
    payout_method   TEXT NOT NULL DEFAULT 'orange_money'
                    CHECK (payout_method IN ('orange_money','mtn_momo','bank_transfer')),
    payout_phone    TEXT,           -- Numéro Mobile Money (Orange/MTN)
    payout_name     TEXT,           -- Nom du bénéficiaire (exactement comme dans le compte MoMo)
    bank_account    TEXT,           -- IBAN/Numéro compte bancaire (si bank_transfer)
    bank_name       TEXT,           -- Nom de la banque

    -- Activation
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at     TIMESTAMPTZ,    -- Date de vérification par le SuperAdmin
    verified_by     UUID REFERENCES auth.users(id),

    -- Seuil de virement automatique (optionnel, en XAF)
    -- Si NULL : virement immédiat après chaque transaction
    payout_threshold NUMERIC(12,2) DEFAULT NULL,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_payout_config_org
    ON public.org_payout_config(organization_id);

-- ── TABLE: payment_transactions (toutes les transactions) ──
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id              UUID REFERENCES public.student_profiles(id) ON DELETE SET NULL,

    -- Référence CamerPay (compte unique SuperAdmin)
    camerpay_uuid           TEXT UNIQUE,
    invoice_id              TEXT UNIQUE NOT NULL,
    pay_url                 TEXT,

    -- Montants (en XAF)
    amount                  NUMERIC(12,2) NOT NULL,
    currency                TEXT NOT NULL DEFAULT 'XAF',
    payment_method          TEXT CHECK (payment_method IN (
                                'orange_money','mtn_momo','stripe','paypal','cash','other'
                            )),

    -- Statut miroir CamerPay
    status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                                'pending','processing','completed','failed',
                                'refunded','cancelled'
                            )),

    -- Type de paiement (détermine le taux de commission)
    payment_type            TEXT NOT NULL
                            CHECK (payment_type IN (
                                'scolarite','inscription','shop','cursus','form'
                            )),

    -- Métadonnées contextuelles
    metadata                JSONB NOT NULL DEFAULT '{}',

    -- Réponse brute CamerPay (pour audit)
    camerpay_raw            JSONB,

    -- Lien vers la commission
    platform_commission_id  UUID,

    -- Lien vers le Mass Payout (virement vers l'école)
    mass_payout_id          UUID,

    -- Liens entités métier
    school_payment_id       UUID REFERENCES public.school_payments(id) ON DELETE SET NULL,
    enrollment_id           UUID,

    -- Snapshot client
    customer_phone          TEXT,
    customer_name           TEXT,
    customer_email          TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_org        ON public.payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_student    ON public.payment_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status     ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_type       ON public.payment_transactions(payment_type);
CREATE INDEX IF NOT EXISTS idx_payment_tx_cpuuid     ON public.payment_transactions(camerpay_uuid);

-- ── TABLE: platform_commissions (commissions SuperAdmin) ──
CREATE TABLE IF NOT EXISTS public.platform_commissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id      UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    gross_amount        NUMERIC(12,2) NOT NULL,   -- Montant total payé
    commission_rate     NUMERIC(7,6) NOT NULL,    -- Ex: 0.005000 = 0.5%
    commission_amount   NUMERIC(12,2) NOT NULL,   -- Revenu CampusFlow
    net_to_org          NUMERIC(12,2) NOT NULL,   -- Ce qui sera viré à l'école

    payment_type        TEXT NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'XAF',

    -- Statut du virement vers l'école
    payout_status       TEXT NOT NULL DEFAULT 'pending'
                        CHECK (payout_status IN ('pending','processing','paid','failed')),

    -- Référence du Mass Payout CamerPay
    camerpay_payout_id  TEXT,          -- ID retourné par /api/mass-payout
    payout_initiated_at TIMESTAMPTZ,
    payout_completed_at TIMESTAMPTZ,
    payout_error        TEXT,          -- Message d'erreur si échec du virement

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_org         ON public.platform_commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_pstatus     ON public.platform_commissions(payout_status);
CREATE INDEX IF NOT EXISTS idx_commission_type        ON public.platform_commissions(payment_type);

-- ── TABLE: mass_payouts (log des virements groupés envoyés à CamerPay) ──
CREATE TABLE IF NOT EXISTS public.mass_payouts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES public.organizations(id),
    camerpay_payout_id  TEXT,                      -- ID retourné par CamerPay
    total_amount        NUMERIC(12,2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'XAF',
    beneficiary_phone   TEXT NOT NULL,             -- Numéro Mobile Money de l'école
    beneficiary_name    TEXT,
    payout_method       TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','completed','failed')),
    error_message       TEXT,
    camerpay_raw        JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mass_payout_org ON public.mass_payouts(organization_id);

-- FK retours
ALTER TABLE public.payment_transactions
    ADD CONSTRAINT fk_platform_commission
    FOREIGN KEY (platform_commission_id)
    REFERENCES public.platform_commissions(id)
    ON DELETE SET NULL;

ALTER TABLE public.payment_transactions
    ADD CONSTRAINT fk_mass_payout
    FOREIGN KEY (mass_payout_id)
    REFERENCES public.mass_payouts(id)
    ON DELETE SET NULL;

-- ── TABLE: platform_config ──
CREATE TABLE IF NOT EXISTS public.platform_config (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_by  UUID REFERENCES auth.users(id)
);

INSERT INTO public.platform_config (key, value, description) VALUES
    ('commission_rate_scolarite',   '0.005', '0.5% sur paiements de scolarité'),
    ('commission_rate_inscription', '0.010', '1% sur frais d''inscription'),
    ('commission_rate_shop',        '0.020', '2% sur achats shop/marketplace'),
    ('commission_rate_cursus',      '0.015', '1.5% sur accès cursus premium'),
    ('commission_rate_form',        '0.010', '1% sur formulaires payants'),
    ('auto_payout_enabled',         'true',  'Activer le virement automatique vers les écoles'),
    ('platform_name',               'CampusFlow', 'Nom de la plateforme')
ON CONFLICT (key) DO NOTHING;

-- ── FUNCTION: Créer commission et déclencher le Mass Payout ──
CREATE OR REPLACE FUNCTION public.create_commission_and_queue_payout(
    p_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx            RECORD;
    v_payout_cfg    RECORD;
    v_rate          NUMERIC(7,6);
    v_commission    NUMERIC(12,2);
    v_net           NUMERIC(12,2);
    v_commission_id UUID;
    v_config_key    TEXT;
BEGIN
    -- Récupérer la transaction complétée
    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE id = p_transaction_id AND status = 'completed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction % non trouvée ou non complétée', p_transaction_id;
    END IF;

    -- Récupérer la config de paiement de l'org
    SELECT * INTO v_payout_cfg
    FROM public.org_payout_config
    WHERE organization_id = v_tx.organization_id AND is_active = TRUE;

    -- Clé de config et taux
    v_config_key := 'commission_rate_' || v_tx.payment_type;
    SELECT value::NUMERIC INTO v_rate
    FROM public.platform_config
    WHERE key = v_config_key;
    v_rate := COALESCE(v_rate, 0.005);

    -- Calcul des montants (arrondi XAF entier)
    v_commission := ROUND(v_tx.amount * v_rate, 0);
    v_net        := v_tx.amount - v_commission;

    -- Créer la commission
    INSERT INTO public.platform_commissions (
        transaction_id, organization_id, gross_amount,
        commission_rate, commission_amount, net_to_org,
        payment_type, currency, payout_status
    ) VALUES (
        p_transaction_id, v_tx.organization_id, v_tx.amount,
        v_rate, v_commission, v_net,
        v_tx.payment_type, v_tx.currency,
        CASE WHEN v_payout_cfg IS NULL THEN 'pending' ELSE 'processing' END
    )
    RETURNING id INTO v_commission_id;

    -- Mettre à jour la transaction
    UPDATE public.payment_transactions
    SET platform_commission_id = v_commission_id, updated_at = NOW()
    WHERE id = p_transaction_id;

    -- Retourner les données pour que l'API Route lance le Mass Payout
    RETURN jsonb_build_object(
        'commission_id',     v_commission_id,
        'net_to_org',        v_net,
        'commission_amount', v_commission,
        'rate',              v_rate,
        'has_payout_config', v_payout_cfg IS NOT NULL,
        'payout_phone',      v_payout_cfg.payout_phone,
        'payout_name',       v_payout_cfg.payout_name,
        'payout_method',     v_payout_cfg.payout_method
    );
END;
$$;

-- ── FUNCTION: Statistiques plateforme SuperAdmin ──
CREATE OR REPLACE FUNCTION public.get_platform_payment_stats(
    p_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_to   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_transactions',    COUNT(pt.id),
        'total_volume',          COALESCE(SUM(pt.amount), 0),
        'total_commission',      COALESCE(SUM(pc.commission_amount), 0),
        'total_paid_to_orgs',    COALESCE(SUM(pc.net_to_org) FILTER (WHERE pc.payout_status = 'paid'), 0),
        'total_pending_payout',  COALESCE(SUM(pc.net_to_org) FILTER (WHERE pc.payout_status IN ('pending','processing')), 0),
        'completed_count',       COUNT(pt.id) FILTER (WHERE pt.status = 'completed'),
        'failed_count',          COUNT(pt.id) FILTER (WHERE pt.status = 'failed'),
        'by_org',                (
            SELECT jsonb_agg(jsonb_build_object(
                'org_id',     o.id,
                'org_name',   o.name,
                'volume',     COALESCE(SUM(pt2.amount), 0),
                'commission', COALESCE(SUM(pc2.commission_amount), 0),
                'net',        COALESCE(SUM(pc2.net_to_org), 0),
                'count',      COUNT(pt2.id)
            ))
            FROM public.payment_transactions pt2
            LEFT JOIN public.platform_commissions pc2 ON pc2.transaction_id = pt2.id
            JOIN public.organizations o ON o.id = pt2.organization_id
            WHERE pt2.completed_at BETWEEN p_from AND p_to
            GROUP BY o.id, o.name
        )
    )
    INTO v_result
    FROM public.payment_transactions pt
    LEFT JOIN public.platform_commissions pc ON pc.transaction_id = pt.id
    WHERE pt.completed_at BETWEEN p_from AND p_to;

    RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

-- ── RLS POLICIES ──
ALTER TABLE public.org_payout_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mass_payouts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config      ENABLE ROW LEVEL SECURITY;

-- org_payout_config : propriétaire de l'org uniquement
CREATE POLICY "opc_owner_only" ON public.org_payout_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = org_payout_config.organization_id
              AND o.owner_id = auth.uid()
        )
    );

-- payment_transactions : étudiant voit les siennes, admin voit celles de son org
CREATE POLICY "pt_student_select" ON public.payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = payment_transactions.student_id
              AND sp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = payment_transactions.organization_id
              AND o.owner_id = auth.uid()
        )
    );

-- platform_commissions : admin org lit ses propres commissions
CREATE POLICY "pc_admin_select" ON public.platform_commissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = platform_commissions.organization_id
              AND o.owner_id = auth.uid()
        )
    );

-- mass_payouts : admin org voit les virements vers son org
CREATE POLICY "mp_admin_select" ON public.mass_payouts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = mass_payouts.organization_id
              AND o.owner_id = auth.uid()
        )
    );

-- platform_config : lecture publique, écriture service_role
CREATE POLICY "pconfig_read" ON public.platform_config FOR SELECT USING (true);

-- ── TRIGGER: updated_at auto ──
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_payout_config_updated
    BEFORE UPDATE ON public.org_payout_config
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_payment_tx_updated
    BEFORE UPDATE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Mise à jour school_payments ──
ALTER TABLE public.school_payments
    ADD COLUMN IF NOT EXISTS payment_transaction_id UUID
        REFERENCES public.payment_transactions(id) ON DELETE SET NULL;
ALTER TABLE public.school_payments
    ADD COLUMN IF NOT EXISTS paid_online BOOLEAN NOT NULL DEFAULT FALSE;

-- ── TARIFICATION & ÉCHÉANCIERS (Filières & Classes) ──
ALTER TABLE public.filieres
    ADD COLUMN IF NOT EXISTS frais_inscription NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS echeances JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.classrooms
    ADD COLUMN IF NOT EXISTS frais_scolarite NUMERIC(10,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS frais_inscription NUMERIC(10,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS echeances JSONB DEFAULT '[]'::jsonb;

-- ── GRANTS service_role ──
GRANT ALL ON public.org_payout_config    TO service_role;
GRANT ALL ON public.payment_transactions TO service_role;
GRANT ALL ON public.platform_commissions TO service_role;
GRANT ALL ON public.mass_payouts         TO service_role;
GRANT ALL ON public.platform_config      TO service_role;
GRANT EXECUTE ON FUNCTION public.create_commission_and_queue_payout(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_payment_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

