'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ChevronLeft, ChevronRight, ExternalLink, Gift, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdsBannerProps {
    userId?: string;
    orgId?: string;
    onSkyUpdate?: (delta: number) => void;
    role?: 'student' | 'prof' | 'admin' | 'public';
}

export function AdsBanner({ userId, orgId, onSkyUpdate, role = 'student' }: AdsBannerProps) {
    const [ads, setAds]             = useState<any[]>([]);
    const [current, setCurrent]     = useState(0);
    const [dismissed, setDismissed] = useState(false);
    const [watchedSecs, setWatchedSecs] = useState(0);
    const [pointsEarned, setPointsEarned] = useState<Record<string, boolean>>({});
    const [viewedAds, setViewedAds] = useState<Record<string, boolean>>({});
    const [muted, setMuted]         = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const viewStartRef = useRef<number>(Date.now());
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Load active ads — no starts_at filter (column may not exist yet, handled by SQL migration)
    useEffect(() => {
        const load = async () => {
            const now = new Date().toISOString();
            const { data } = await supabase
                .from('advertisements')
                .select('*')
                .eq('is_active', true)
                .or(`ends_at.is.null,ends_at.gte.${now}`)
                .order('created_at', { ascending: false })
                .limit(10);
            if (!data || data.length === 0) return;

            // Load which ads this user already earned points for
            if (userId) {
                const adIds = data.map((a: any) => a.id);
                const { data: myViews } = await supabase
                    .from('ad_views')
                    .select('ad_id, points_awarded')
                    .eq('user_id', userId)
                    .in('ad_id', adIds);
                const earnedMap: Record<string, boolean> = {};
                const viewedMap: Record<string, boolean> = {};
                (myViews || []).forEach((v: any) => {
                    earnedMap[v.ad_id] = v.points_awarded;
                    viewedMap[v.ad_id] = true;
                });
                setPointsEarned(earnedMap);
                setViewedAds(viewedMap);
            }
            setAds(data);
        };
        load();
    }, [userId]);    const currentAd = ads[current];

    // Watch timer
    useEffect(() => {
        if (!currentAd || dismissed) return;
        setWatchedSecs(0);
        viewStartRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setWatchedSecs(s => {
                const next = s + 1;
                if (next === currentAd.min_watch_seconds && userId) { awardPoints(currentAd); }
                return next;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [current, currentAd?.id, dismissed]);

    const recordView = useCallback(async (ad: any, completed: boolean, clicked = false) => {
        if (!userId) return; // public/anonymous users don't get tracked
        const secs = Math.round((Date.now() - viewStartRef.current) / 1000);
        await supabase.from('ad_views').upsert({
            ad_id: ad.id, user_id: userId, organization_id: orgId,
            watched_seconds: secs, completed, clicked,
            points_awarded: pointsEarned[ad.id] || completed,
        }, { onConflict: 'ad_id,user_id' });
        setViewedAds(prev => ({ ...prev, [ad.id]: true }));
    }, [userId, orgId, pointsEarned]);

    const awardPoints = useCallback(async (ad: any) => {
        if (!userId || pointsEarned[ad.id]) return;
        const pts = ad.sky_points_reward || 1;
        const tables = ['student_profiles', 'teacher_profiles'];
        for (const table of tables) {
            const { data: profile } = await supabase.from(table).select('id, sky_points').eq('id', userId).single();
            if (profile) {
                await supabase.from(table).update({ sky_points: (profile.sky_points || 0) + pts }).eq('id', userId);
                break;
            }
        }
        setPointsEarned(prev => ({ ...prev, [ad.id]: true }));
        onSkyUpdate?.(pts);
        toast.success(`+${pts} Sky Point${pts > 1 ? 's' : ''} gagné !`, { description: `Pour avoir regardé : ${ad.title}`, duration: 3000 });
        await supabase.from('ad_views').upsert({
            ad_id: ad.id, user_id: userId, organization_id: orgId,
            watched_seconds: ad.min_watch_seconds, completed: true, points_awarded: true,
        }, { onConflict: 'ad_id,user_id' });
    }, [pointsEarned, userId, orgId, onSkyUpdate]);

    const goNext = () => { if (currentAd) recordView(currentAd, watchedSecs >= currentAd.min_watch_seconds); setCurrent(c => (c + 1) % ads.length); };
    const goPrev = () => { if (currentAd) recordView(currentAd, watchedSecs >= currentAd.min_watch_seconds); setCurrent(c => (c - 1 + ads.length) % ads.length); };
    const handleClick = () => {
        if (!currentAd?.link_url) return;
        recordView(currentAd, watchedSecs >= currentAd.min_watch_seconds, true);
        window.open(currentAd.link_url, '_blank', 'noopener');
    };
    const handleDismiss = () => { if (currentAd) recordView(currentAd, watchedSecs >= currentAd.min_watch_seconds); setDismissed(true); };

    if (ads.length === 0 || dismissed || !currentAd) return null;

    const pct = Math.min(100, (watchedSecs / (currentAd.min_watch_seconds || 5)) * 100);
    const alreadyEarned = pointsEarned[currentAd.id];
    const isVideo = currentAd.media_type === 'video';

    return (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="relative rounded-2xl overflow-hidden border border-white/[0.10] shadow-xl shadow-black/40 mb-4">
            {/* Timer bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/[0.10] z-10">
                <motion.div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300"
                    animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
            </div>
            {/* Badge PUB */}
            <div className="absolute top-2.5 left-3 z-10 flex items-center gap-1.5">
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-black/60 text-slate-300 border border-white/10 font-semibold uppercase tracking-wider">Pub</span>
                {alreadyEarned && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/20 font-semibold">Points gagnés ✓</span>}
            </div>
            {/* Fermer */}
            <button onClick={handleDismiss} className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-slate-400 hover:text-white border border-white/10">
                <X className="w-3.5 h-3.5" />
            </button>
            {/* Navigation */}
            {ads.length > 1 && (
                <>
                    <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white border border-white/10"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={goNext} className="absolute right-10 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white border border-white/10"><ChevronRight className="w-3.5 h-3.5" /></button>
                </>
            )}
            {/* Content */}
            <div className={cn('flex gap-3 p-3 pt-6', currentAd.link_url ? 'cursor-pointer' : '')} onClick={!isVideo ? handleClick : undefined}>
                {currentAd.media_url && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-white/[0.06] relative">
                        {isVideo ? (
                            <>
                                <video
                                    ref={videoRef}
                                    src={currentAd.media_url}
                                    className="w-full h-full object-cover"
                                    autoPlay loop muted={muted} playsInline
                                />
                                <button onClick={e => { e.stopPropagation(); setMuted(v => !v); }}
                                    className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                                    {muted ? <VolumeX className="w-2.5 h-2.5 text-white" /> : <Volume2 className="w-2.5 h-2.5 text-white" />}
                                </button>
                            </>
                        ) : (
                            <img src={currentAd.media_url} alt={currentAd.title} className="w-full h-full object-cover"
                                onError={e => { (e.target as any).style.display = 'none'; }} />
                        )}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{currentAd.title}</p>
                    {currentAd.description && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{currentAd.description}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {userId && !alreadyEarned ? (
                            <div className="flex items-center gap-1.5">
                                <Star className="w-3 h-3 text-amber-400" />
                                <span className="text-[10px] text-amber-300 font-semibold">
                                    {watchedSecs < currentAd.min_watch_seconds
                                        ? `+${currentAd.sky_points_reward} pts dans ${currentAd.min_watch_seconds - watchedSecs}s`
                                        : `+${currentAd.sky_points_reward} pts...`}
                                </span>
                            </div>
                        ) : userId && alreadyEarned ? (
                            <div className="flex items-center gap-1.5">
                                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] text-emerald-300 font-semibold">+{currentAd.sky_points_reward} Sky Points gagnés !</span>
                            </div>
                        ) : null}
                        {currentAd.link_url && <div className="flex items-center gap-1 text-[10px] text-indigo-400"><ExternalLink className="w-3 h-3" /><span>En savoir plus</span></div>}
                    </div>
                </div>
            </div>
            {/* Dots */}
            {ads.length > 1 && (
                <div className="flex justify-center gap-1 pb-2">
                    {ads.map((_: any, i: number) => (
                        <button key={i} onClick={() => setCurrent(i)}
                            className={cn('h-1.5 rounded-full transition-all', i === current ? 'bg-amber-400 w-3' : 'bg-white/20 w-1.5')} />
                    ))}
                </div>
            )}
        </motion.div>
    );
}