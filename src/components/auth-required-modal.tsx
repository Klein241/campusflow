'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, LogIn, UserPlus, X } from 'lucide-react';

interface AuthRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
}

/**
 * AuthRequiredModal — Global modal shown when a guest tries to interact
 * Displays a prompt to login. The user is redirected to the login page.
 */
export function AuthRequiredModal({ isOpen, onClose, message }: AuthRequiredModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-[#161B26] rounded-2xl max-w-md w-full border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500/20 to-amber-500/20 flex items-center justify-center">
                            <Lock className="h-8 w-8 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Connexion requise</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            {message || 'Connectez-vous pour accéder à cette fonctionnalité.'}
                        </p>

                        <div className="space-y-3">
                            <a
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:from-violet-500 hover:to-purple-500 transition-all"
                            >
                                <LogIn className="w-4 h-4" />
                                Se connecter
                            </a>
                            <a
                                href="/onboarding"
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 transition-all"
                            >
                                <UserPlus className="w-4 h-4" />
                                Créer un compte
                            </a>
                        </div>

                        <button
                            onClick={onClose}
                            className="mt-4 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                        >
                            Continuer en tant qu&apos;invité
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
