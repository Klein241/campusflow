"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2, BookOpen } from "lucide-react"
import { coursesApi, DEFAULT_TRANSLATION as DEFAULT_courses_ID, coursesVerse } from "@/lib/unified-courses-api"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/lib/store"

interface SearchResult {
    reference: string;
    text: string;
    id?: string;
}

export function coursesSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const { setcoursesNavigation } = useAppStore()

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);

        try {
            // Use the unified courses API's search method
            const searchResults = await coursesApi.searchcourses(query, DEFAULT_courses_ID);

            if (searchResults && searchResults.length > 0) {
                setResults(searchResults.map((v: coursesVerse) => ({
                    reference: v.reference,
                    text: v.text,
                    id: v.reference
                })));
            } else {
                // Fallback: try to parse the query as a reference (e.g. "Jean 3:16")
                const ref = coursesApi.parseReference(query);
                if (ref) {
                    const chapter = await coursesApi.getChapter(ref.bookId, ref.chapter, DEFAULT_courses_ID);
                    if (chapter && chapter.verses.length > 0) {
                        // If specific verses requested, filter them
                        const verses = ref.verseStart
                            ? chapter.verses.filter((v: coursesVerse) => {
                                const num = v.verse || 0;
                                return num >= (ref.verseStart || 0) && num <= (ref.verseEnd || ref.verseStart || 0);
                            })
                            : chapter.verses;

                        setResults(verses.map((v: coursesVerse) => ({
                            reference: v.reference,
                            text: v.text,
                            id: v.reference
                        })));
                    } else {
                        setResults([]);
                    }
                } else {
                    setResults([]);
                }
            }
        } catch (e) {
            console.error("Search failed", e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectResult = (reference: string) => {
        const ref = coursesApi.parseReference(reference);
        if (ref) {
            setcoursesNavigation({ bookId: ref.bookId, chapterId: `${ref.bookId}.${ref.chapter}` });
            onClose();
        }
    };

    return (
        <div className="flex flex-col h-[50vh] bg-background border rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un verset (ex: Jean 3:16)"
                        className="pl-9"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
                </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
                {results.length === 0 && !loading && (
                    <div className="text-center text-muted-foreground py-8">
                        <p className="mb-2">Recherchez une référence biblique.</p>
                        <p className="text-xs">Ex: Jean 3:16, Psaume 23:1, Romains 8:28</p>
                    </div>
                )}

                <div className="space-y-3">
                    {results.map((result, i) => (
                        <div
                            key={i}
                            onClick={() => handleSelectResult(result.reference)}
                            className="p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <BookOpen className="h-3 w-3 text-primary" />
                                <span className="font-bold text-sm text-primary">{result.reference}</span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{result.text}</p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
