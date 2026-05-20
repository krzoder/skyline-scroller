# Skyline Scroller

Proceduralnie generowany, scrollujący się pejzaż miasta z efektem paralaksy, cyklem dnia i nocy oraz pogodą. Wszystko rysuje się na HTML5 Canvas - bez zewnętrznych bibliotek graficznych, tylko czysty TypeScript.

**Wersja**: 1.2.0

## Gdzie to zobaczyć

Aplikacja jest dostępna pod dwoma adresami - oba pokazują dokładnie tę samą wersję:

- **GitHub Pages** - https://krzoder.github.io/skyline-scroller/
- **fidom.link** (homelab) - https://skyline-scroller.fidom.link/

Repozytorium: https://github.com/krzoder/skyline-scroller

---

## Jak to działa - od kodu do strony w internecie

Cały proces jest zautomatyzowany. Kiedy ktoś wrzuca zmiany do gałęzi `main`, GitHub sam buduje aplikację i publikuje ją na obu stronach. Krok po kroku:

### 1. Ktoś robi zmianę i otwiera Pull Request

Każda zmiana zaczyna się w osobnej gałęzi (branchu). Pull Request (PR) to taki "wniosek o włączenie zmiany do głównej wersji" - ktoś inny może go obejrzeć i zatwierdzić, zanim zmiana trafi do `main`.

### 2. GitHub uruchamia testy (CI)

Gdy tylko powstaje PR, GitHub w tle:

- sprawdza, czy kod nie ma błędów składniowych (TypeScript),
- uruchamia **67 testów automatycznych**,
- buduje aplikację, żeby się upewnić, że da się ją zbudować.

Plik konfiguracyjny: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

Jeśli coś się sypnie - pojawia się czerwony krzyżyk przy PR i nie da się go zmergować, dopóki nie będzie naprawione.

### 3. Merge do `main`

Gdy CI jest zielony i ktoś zatwierdzi PR, można go zmergować do gałęzi `main`. To moment, w którym zmiana staje się "oficjalna".

### 4. Automatyczna publikacja na GitHub Pages

Zaraz po merge do `main`:

- workflow [`deploy.yml`](.github/workflows/deploy.yml) pobiera już zbudowaną wersję z CI,
- wgrywa ją na gałąź `gh-pages`,
- GitHub serwuje ją pod adresem **krzoder.github.io/skyline-scroller/**.

Cała publikacja trwa około **2-3 minuty** od momentu mergea. Nic nie trzeba klikać ręcznie.

### 5. Publikacja na fidom.link (homelab)

Druga lokalizacja (`skyline-scroller.fidom.link`) jest na prywatnym serwerze (homelab) z proxy Traefik + kontener nginx.

Workflow [`deploy-fidom.yml`](.github/workflows/deploy-fidom.yml) uruchamia się **ręcznie** (przyciskiem "Run workflow" w zakładce Actions na GitHubie). Buduje aplikację i wgrywa pliki bezpośrednio na serwer przez self-hosted runner. Docelowo będzie odpalał się automatycznie po każdym pushu do `main`, ale na razie wymaga jednego kliknięcia.

Pełne stawianie kontenera + Traefik route + nginx config jest opisane w osobnym workflow w repo `fszalaj/homelab` - `deploy-skyline-scroller.yml`.

---

## Jak samemu wprowadzić zmianę - instrukcja krok po kroku

Załóżmy, że chcesz coś poprawić w aplikacji. Oto pełna ścieżka:

### Krok 1 - Utwórz nową gałąź

Na lokalnej kopii repozytorium (albo bezpośrednio w GitHubie):

```bash
git checkout -b moja-zmiana
```

Nazwa gałęzi może być dowolna, ale dobrze, żeby opisywała co robisz, np. `fix-color-bug` albo `dodaj-nowy-biom`.

### Krok 2 - Zrób zmiany i zacommituj

```bash
git add .
git commit -m "krótki opis tego, co zmieniłeś"
git push -u origin moja-zmiana
```

### Krok 3 - Otwórz Pull Request

GitHub po pushu pokaże Ci link typu:

> https://github.com/krzoder/skyline-scroller/pull/new/moja-zmiana

Klikasz, opisujesz **co i dlaczego** zmieniłeś, klikasz "Create pull request".

### Krok 4 - Poczekaj na CI

Pod PR-em zobaczysz checklistę:

- ✅ Lint & Typecheck
- ✅ Test
- ✅ Build (Node 24)
- ✅ CodeQL
- ✅ Build and deploy preview

Jeśli wszystko zielone - dobrze. Jeśli coś czerwone - klikasz w nazwę i czytasz, co się wywaliło.

### Krok 5 - Merge do main

Klikasz zielony przycisk **"Squash and merge"** (preferowana metoda - łączy wszystkie commity z PR-a w jeden). Potwierdzasz.

### Krok 6 - Czekasz 2-3 minuty

W zakładce [Actions](https://github.com/krzoder/skyline-scroller/actions) zobaczysz, że ruszył workflow "Deploy to GitHub Pages". Jak skończy - zmiana jest na żywo pod **krzoder.github.io/skyline-scroller/**.

Dla fidom.link - wchodzisz w [Actions → Deploy fidom.link](https://github.com/krzoder/skyline-scroller/actions/workflows/deploy-fidom.yml) i klikasz **Run workflow**.

### Etykieta `auto-merge` (skrót dla zaufanych zmian)

Jeśli dodasz do PR-a etykietę **`auto-merge`**, to po przejściu wszystkich testów PR sam się zmerguje - nie trzeba klikać przycisku. Pasuje do drobnych zmian (literówki, bumpy zależności).

---

## Dla developerów - lokalne uruchomienie

Wymagania: **Node.js 24+** (Active LTS). `package.json` ma `engines.node: ">=24.0.0 <27.0.0"` i `scripts/dev-setup.sh` sprawdza wersję przed instalacją.

```bash
# pierwszy raz po sklonowaniu repo:
git clone https://github.com/krzoder/skyline-scroller
cd skyline-scroller
bash scripts/dev-setup.sh

# dalej:
npm run dev        # serwer deweloperski (http://localhost:5173)
npm run build      # produkcyjny build do katalogu dist/
npx vitest run     # uruchom testy (67 case'ów)
```

### Konsola deweloperska w aplikacji

Wbudowany terminal: klawisz `t` lub `Enter` z głównego ekranu. Dostępne komendy:

- `seed [wartość|random]` - pokaż lub ustaw seed
- `speed <wartość>` - tempo czasu (akceptuje wyrażenia typu `2*pi`)
- `biome [nazwa]` - wymuś biom (lub pokaż aktualny)
- `debug-state` - dumpuje stan gry (seed, cameraX, biome, sky time, etc.) jako JSON do clipboardu - bardzo przydatne do zgłoszeń bugów
- `format [24h|12h|score]` - format wyświetlania czasu
- `help` - lista wszystkich komend

### Struktura kodu

- `src/main.ts` (427 LOC) - orchestrator: tworzy `Game`, wpina moduły UI, składa keyboard shortcuts.
- `src/ui/` - 10 modułów odpowiedzialnych za poszczególne kawałki interfejsu (settings, advanced, custom-gen, terminal-bind, gestures, audio-controls, error-toast, seed-controls, keyboard-shortcuts, window-manager).
- `src/engine/` - silnik renderowania (`Game`, `Layer`, `SkySystem`, `Terminal`, `Renderable`).
- `src/procgen/` - generacja proceduralna (`CityGenerator`, `BiomeSystem`, `TreeConfig`).
- `src/procgen/entities/` - rysowane obiekty (`Building`, `Tree`, `Landscape`, `Ground`, `CityEntity`, `TextureGenerator`).
- `src/regions/` - rejestr biomów (declarative table z trees, materials, roofs, palette).
- `src/utils/` - kontrakty: `Random` (deterministyczny RNG z `.fork(label)`), `Expression` (sandboxowany parser zamiast `eval()`), `deepClone` (`structuredClone`).
- `src/config.ts` - centralne stałe (czasy trwania biomów, prędkość kamery, zakresy wysokości feature'ów).

Pełna dokumentacja techniczna i architektura projektu są w katalogu [`wiki/`](wiki/) - to baza wiedzy w formacie Obsidian. Wystarczy otworzyć katalog `wiki/` jako vault w aplikacji Obsidian.

Najważniejsze strony:

- [`wiki/index.md`](wiki/index.md) - spis treści
- [`wiki/hot.md`](wiki/hot.md) - aktualny stan projektu
- [`wiki/decisions/`](wiki/decisions/) - decyzje architektoniczne (DEC-NN)

---

## Stos technologiczny

- **TypeScript** (kompilator: tsc)
- **Vite** (bundler)
- **Vitest** (testy - 67 case'ów w 5 plikach)
- **Canvas API 2D** (rendering, bez WebGL i bez bibliotek graficznych)
- **Zero zewnętrznych zależności w runtime** - w przeglądarce ląduje czysty kod aplikacji (~79 kB, ~22 kB po gzipie).

## Hosting

- **GitHub Pages** - darmowy hosting GitHuba, automatyczny po merge do `main`.
- **fidom.link** - własny serwer (homelab) z Traefikiem i nginxem, dostęp publiczny (bez logowania).

Decyzja architektoniczna i konfiguracja homelaba: [`wiki/decisions/DEC-09-homelab-deploy.md`](wiki/decisions/DEC-09-homelab-deploy.md).
