'use client';

import { useEffect } from 'react';

/**
 * Patch DOM pour empêcher Google Translate ou les extensions de navigateur
 * de faire crasher React avec l'erreur :
 * "NotFoundError: The node to be removed is not a child of this node" / "Node.removeChild / Node.removeEnfant"
 */
export function DomTranslatePatch() {
    useEffect(() => {
        if (typeof window === 'undefined' || typeof Node === 'undefined' || !Node.prototype) return;

        const originalRemoveChild = Node.prototype.removeChild;
        Node.prototype.removeChild = function <T extends Node>(child: T): T {
            if (child && child.parentNode !== this) {
                // Le traducteur Google a enveloppé le noeud dans un <font>, évitons le crash
                if (child.parentNode) {
                    return child.parentNode.removeChild(child);
                }
                return child;
            }
            return originalRemoveChild.apply(this, [child]) as T;
        };

        const originalInsertBefore = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
            if (referenceNode && referenceNode.parentNode !== this) {
                if (referenceNode.parentNode) {
                    return referenceNode.parentNode.insertBefore(newNode, referenceNode);
                }
                return newNode;
            }
            return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
        };
    }, []);

    return null;
}
