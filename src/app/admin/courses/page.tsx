"use client"

import { coursesManager } from "@/components/admin/courses-manager"

export default function AdmincoursesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestion de la courses</h1>
                <p className="text-muted-foreground">
                    La courses (LSG) est pré-chargée dans l'application via des fichiers locaux (/public/courses).
                    <br />
                    L'upload ci-dessous est optionnel et sert uniquement à surcharger les fichiers par défaut via Supabase Storage.
                </p>
            </div>

            <coursesManager />
        </div>
    )
}
