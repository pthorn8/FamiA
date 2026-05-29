# Familjeappen

Delade inköpslistor, att-göra-listor och kalender för familjen. Bjud in andra med en kod så ser ni samma sak i realtid.

Byggt med **Next.js** och **Firebase**. Helt gratis att köra för en familj.

---

## Vad som finns

**Hem-vy**
- Hälsning som anpassar sig efter tiden på dygnet
- Snabb statistik (att göra, dagens händelser, försenat)
- Vad som behöver göras idag
- Kommande händelser nästa vecka
- Senaste aktivitet från familjen

**Inloggning**
- Logga in med Google (ett klick)
- Eller skapa konto med e-post och lösenord

**Familjer / grupper**
- Skapa en familj eller gå med via inbjudningskod (t.ex. `GLAD-RAV-72`)
- Hör till flera familjer samtidigt och växla mellan dem
- Bjud in via kopierbar kod eller systemets dela-funktion
- Lämna en familj eller byt namn på den

**Delade listor**
- Skapa olika listor med egna ikoner (12 att välja mellan)
- Bocka av saker i realtid, alla ser det direkt
- **Tilldela uppgifter** till specifika familjemedlemmar (visas med personens färg)
- **Förfallodag** (idag / imorgon / valfritt datum)
- **Anteckningar** på saker
- Försenade saker markeras med rött
- Rensa klara saker med ett klick
- Byt namn, ikon eller ta bort hela listor

**Delad kalender**
- Lägg till händelser med tid och färg (5 färger)
- Återkommande händelser (varje dag/vecka/månad/år)
- Inbyggd-vy med kommande händelser
- Hoppa snabbt till idag

**Aktivitetsflöde**
- Se vem som gjort vad i familjen
- Grupperat per dag (idag, igår, veckodag)
- Statistik den senaste veckan (vem är mest aktiv)
- Varje persons egen färg på sina händelser

**Färger per medlem**
- Varje familjemedlem får automatiskt en egen färg
- Samma färg överallt: avatar, tilldelade uppgifter, aktivitetsflöde
- 8 olika färger fördelas baserat på namn

**Mörkt läge**
- Automatiskt baserat på telefonens inställning
- Eller manuellt val (ljust / mörkt / auto)

**PWA**
- Installera på hemskärmen som en riktig app
- Fungerar offline (cachning via service worker)
- App-ikoner i alla storlekar

---

## Kom igång (ca 20 minuter)

Du behöver bara göra detta en gång.

### 1. Installera Node.js
Ladda ner och installera från https://nodejs.org (välj LTS-versionen).

### 2. Skapa ett Firebase-projekt
1. Gå till https://console.firebase.google.com och klicka **Lägg till projekt**.
2. Ge det ett namn och klicka igenom.
3. Klicka på webb-ikonen **`</>`** för att lägga till en webbapp. Ge den ett smeknamn.
4. Du får nu en ruta med `firebaseConfig`. Spara värdena.

### 3. Slå på inloggning och databas
- **Authentication**: Build → Authentication → Get started → välj **Google** → aktivera. Vill du också ha email/lösenord, aktivera **Email/Password**.
- **Firestore Database**: Build → Firestore Database → Create database → välj region (t.ex. europe-west1) → starta i **production mode**.
- **Säkerhetsregler**: i Firestore, gå till fliken **Rules**, ta bort allt och klistra in från `firestore.rules`. Klicka **Publish**.

### 4. Koppla appen till ditt Firebase-projekt
1. Kopiera `.env.local.example` till `.env.local`.
2. Fyll i värdena från `firebaseConfig`.

### 5. Starta appen
```bash
npm install
npm run dev
```

Öppna http://localhost:3000 i webbläsaren.

---

## Lägg ut den på nätet (gratis)

Så hela familjen kan nå den från sina telefoner:

1. Skapa konto på https://vercel.com (logga in med GitHub).
2. Lägg upp projektet på GitHub eller dra mappen till Vercel.
3. I Vercel, lägg till samma värden från `.env.local` under **Settings → Environment Variables**.
4. Klicka **Deploy**. Du får en länk som `familjeappen.vercel.app`.
5. I Firebase → Authentication → Settings → **Authorized domains**, lägg till din vercel-domän.

Skicka länken till familjen. På telefonen kan de välja "Lägg till på hemskärmen" så blir det som en riktig app.

---

## Möjliga utbyggnader

- **Push-notiser** när någon ändrar en lista eller lägger till en händelse
- **Svep för att ta bort** uppgifter
- **Veckosvy** i kalendern
- **Sökning** i listor och händelser
- **Mat-vecka-planering** med automatiska inköpslistor
- **Kategorier inom listor** (mejeri, frukt etc. i inköpslista)
- **Återkommande uppgifter** (inte bara händelser)

---

## Projektstruktur

```
app/
  page.js              Huvudsida med flikar och familjeväxlare
  layout.js            Root-layout med providers
  globals.css          Designsystem (färger, ljust+mörkt läge, animationer)

components/
  Login.js             Inloggning (Google + email)
  Onboarding.js        Skapa/gå med i familj
  Dashboard.js         Hem-vy med dagens översikt
  Lists.js             Listor med tilldelning + förfallodag + anteckningar
  CalendarView.js      Kalender med återkommande händelser
  ActivityFeed.js      Aktivitetsflöde med statistik
  Family.js            Medlemmar, inbjudan, inställningar
  Sheet.js             Återanvändbar botten-modal
  ServiceWorkerRegister.js  Registrerar service worker

lib/
  firebase.js          Anslutning till Firebase
  AuthContext.js       Inloggad användare
  ToastContext.js      Notismeddelanden
  ThemeContext.js      Ljust/mörkt läge
  colors.js            Färgsystem för medlemmar
  data.js              All databaslogik

public/
  manifest.json        PWA-konfiguration
  sw.js                Service worker för offline
  icon-*.png           App-ikoner
  favicon.ico

firestore.rules        Säkerhetsregler (klistras in i Firebase)
.env.local.example     Mall för Firebase-konfiguration
```

---

## Tips för utveckling

- All databaslogik ligger i `lib/data.js`.
- CSS-variablerna högst upp i `app/globals.css` styr hela designsystemet, både ljust och mörkt läge.
- Vill du lägga till en ny tabb? Lägg till i `TABS`-arrayen i `app/page.js`.
- Aktivitetsloggen läggs till automatiskt via `logActivity()`-anrop i data-funktionerna.
- Medlemsfärger kommer från `lib/colors.js` och bestäms automatiskt utifrån namn.
