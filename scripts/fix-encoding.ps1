$f = 'src\components\campus\cursus\student-cursus.tsx'
$c = Get-Content $f -Raw -Encoding UTF8

# Fix all mojibake sequences
$c = $c -replace 'LeÃ§on marquÃ©e terminÃ©e âœ…', 'Leçon marquée terminée ✅'
$c = $c -replace 'RÃ©clamation envoyÃ©e âœ…', 'Réclamation envoyée ✅'
$c = $c -replace 'GÃ©nÃ©rale toutes matiÃ¨res', 'Générale toutes matières'
$c = $c -replace 'Points accumulÃ©s', 'Points accumulés'
$c = $c -replace 'LeÃ§ons terminÃ©es', 'Leçons terminées'
$c = $c -replace 'ComplÃ©tÃ©s', 'Complétés'
$c = $c -replace 'Mes MatiÃ¨res', 'Mes Matières'
$c = $c -replace 'Aucune matiÃ¨re disponible', 'Aucune matière disponible'
$c = $c -replace "publiÃ© de contenu", 'publié de contenu'
$c = $c -replace 'chapitre publiÃ© pour', 'chapitre publié pour'
$c = $c -replace 'leÃ§ons', 'leçons'
$c = $c -replace 'leÃ§on\b', 'leçon'
$c = $c -replace 'LeÃ§ons\b', 'Leçons'
$c = $c -replace 'RÃ©duire', 'Réduire'
$c = $c -replace 'TerminÃ©', 'Terminé'
$c = $c -replace 'Marquer comme terminÃ©', 'Marquer comme terminé'
$c = $c -replace 'RÃ©ussi', 'Réussi'
$c = $c -replace 'RatÃ©', 'Raté'
$c = $c -replace 'RÃ©clamer', 'Réclamer'
$c = $c -replace 'RÃ©clamation de note', 'Réclamation de note'
$c = $c -replace 'la rÃ©clamation', 'la réclamation'
$c = $c -replace 'envoyÃ©e', 'envoyée'

# Fix emojis
$c = $c -replace 'âœ…', '✅'
$c = $c -replace 'âœ"', '✓'
$c = $c -replace 'âœ—', '✗'
$c = $c -replace 'âš¡', '⚡'
$c = $c -replace 'â€"', '—'
$c = $c -replace 'â­', '⭐'
$c = $c -replace 'â"€', '─'

# Fix emoji sequences (encoded multi-byte emojis)
# 📚 = \xF0\x9F\x93\x9A displayed as ðŸ"š
$c = $c -replace 'ðŸ"š', '📚'
# 📖 = ðŸ"–
$c = $c -replace 'ðŸ"–', '📖'
# 👨‍🏫 teacher emoji
$c = $c -replace "ðŸ'¨â€ðŸ«", '👨‍🏫'

Set-Content $f $c -Encoding UTF8 -NoNewline
Write-Host "Done: $f"
