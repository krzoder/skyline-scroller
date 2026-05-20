---
name: House style
description: Konwencje pisania tekstu i kodu w tym repo - zasady stylu, których wszystkie agenty (Claude, Codex) trzymają się bez przypominania.
type: concept
tags: [style, conventions]
---

# House style

Krótka karta stylu dla każdego tekstu generowanego w repo (README, wiki, commity, PR, komentarze, czat).

## Myślniki

**Nigdy** nie używamy długich myślników: ani em-dasha `—` (U+2014), ani en-dasha `–` (U+2013). Tylko zwykły hyphen-minus `-` (U+002D).

| Zastosowanie | Źle | Dobrze |
|---|---|---|
| Wtrącenie w zdaniu | `to jest test — sprawdź` | `to jest test - sprawdź` |
| Zakres liczbowy | `2–3 minuty` | `2-3 minuty` |
| Strzałka procesu | `branch → push → PR` | `branch -> push -> PR` lub `branch, push, PR` |

Dotyczy:
- prozy w PL i EN,
- markdownu (uwaga na auto-corecty w edytorach),
- commit messages i PR descriptions,
- nagłówków i list,
- komentarzy w kodzie.

**Powód:** użytkownik traktuje długie myślniki jako AI-tell i wizualny dystraktor.

## Język

- Czat z użytkownikiem: polski.
- Pliki w repo (kod, komentarze, identyfikatory, dokumenty techniczne): angielski.
- Wyjątek: `README.md` jest po polsku, bo ma być przystępny dla osób nietechnicznych.
- W polskim używamy polskich diakrytyków (ą, ć, ę, ł, ń, ó, ś, ź, ż).

## Commity i PR-y

- Bez "Claude", "AI", "Co-Authored-By Claude" i podobnych atrybucji.
- Format: konwencjonalne prefiksy (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `wiki:`).
- Body: dlaczego, nie co.

## Komentarze w kodzie

- Domyślnie zero komentarzy.
- Komentarz tylko gdy WHY jest nieoczywiste (ukryte ograniczenie, subtelna inwariancja, workaround pod konkretny bug).
- Nigdy nie streszczamy tego, co kod sam pokazuje.

## Linki

Bezwzględne URL-e tylko dla zewnętrznych zasobów. W repo i wiki preferujemy:
- ścieżki relatywne (`[link](../foo/bar.md)`) w README i prozie technicznej,
- [[wikilinki]] w obrębie vault'a Obsidiana.

## Egzekwowanie

- Globalna pamięć agenta: `feedback_dashes.md` (skyline-scroller memory).
- Pre-commit lint (TODO): grep na `—` i `–` w stagowanych plikach z błędem.
- Lint wiki: `claude-obsidian:wiki-lint` powinien raportować długie myślniki jako warning.

## Powiązane

- [[../decisions/DEC-08-master-simplification-plan]] - master plan
- [[../operations/codex-integration]] - jak Codex powinien stosować ten styl
