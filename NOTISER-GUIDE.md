# Push-notiser – uppsättning

Notiserna skickas av en liten serverfunktion på Vercel (`/api/notify`) som använder Firebase Admin. Du behöver inte Blaze-planen. Däremot behöver du fylla i två nycklar. Det tar ungefär tio minuter.

## Översikt
1. Hämta en VAPID-nyckel (för webb-push)
2. Hämta ett service account (så servern får skicka notiser)
3. Lägg in nycklarna lokalt och i Vercel
4. Installera, pusha och deploya

---

## 1. VAPID-nyckel

1. Gå till Firebase Console → klicka kugghjulet → **Project settings**
2. Klicka på fliken **Cloud Messaging**
3. Scrolla ner till **Web Push certificates**
4. Klicka **Generate key pair**
5. Kopiera nyckeln som dyker upp (en lång textsträng)

Lägg in den på två ställen:

**I din lokala `.env.local`:**
```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=den-långa-nyckeln-här
```

**I Vercel:** Settings → Environment Variables → lägg till
- Name: `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- Value: samma nyckel

---

## 2. Service account

1. I Firebase Console → **Project settings** → fliken **Service accounts**
2. Klicka **Generate new private key** → bekräfta → en JSON-fil laddas ner
3. Öppna filen i en textredigerare och kopiera **hela innehållet** (allt från `{` till `}`)

**I Vercel:** Settings → Environment Variables → lägg till
- Name: `FIREBASE_SERVICE_ACCOUNT`
- Value: klistra in hela JSON-innehållet

Den här nyckeln är hemlig. Lägg den ALDRIG i koden eller på GitHub, bara i Vercels miljövariabler.

---

## 3. Installera firebase-admin lokalt

I projektmappen:
```bash
npm install
```
Det hämtar `firebase-admin` som redan står i package.json.

---

## 4. Pusha och deploya

```bash
git add .
git commit -m "lägg till push-notiser och ikonprickar"
git push
```

Vercel bygger om automatiskt. Efter att du lagt till miljövariablerna kan du behöva trigga en ny deploy (Vercel → Deployments → ... → Redeploy) så att de laddas in.

---

## Så aktiverar familjen notiser

Varje person gör så här på sin egen telefon:
1. Öppna appen (måste vara tillagd på hemskärmen på iPhone)
2. Gå till **Familj**-fliken
3. Tryck på **Notiser** → tillåt när telefonen frågar

Sedan får de en notis när någon annan skickar ett meddelande, lägger till i en lista, eller lägger till en händelse.

---

## Viktigt om iPhone

- Push-notiser på iPhone fungerar **bara om appen är tillagd på hemskärmen** (inte i vanliga Safari)
- Det kräver iOS 16.4 eller nyare
- Personen måste tillåta notiser när appen frågar

På Android och dator fungerar det direkt i webbläsaren också.

---

## Felsökning

**Får inga notiser:**
- Kolla att båda miljövariablerna finns i Vercel och att du gjort en ny deploy efteråt
- Kolla att personen tryckt "Notiser" i Familj-fliken och tillåtit dem
- På iPhone: är appen tillagd på hemskärmen?

**"FIREBASE_SERVICE_ACCOUNT saknas" i Vercel-loggarna:**
- Miljövariabeln är inte tillagd, eller så behöver du göra en ny deploy

**Prickarna på ikonerna** (nytt meddelande / ny aktivitet) fungerar direkt utan någon uppsättning. De visas så fort någon annan gör något, och försvinner när du öppnar fliken.

---

# Påminnelser på förfallodatum (Cloud Function)

Detta är en schemalagd funktion som varje morgon kl 07:00 skickar en notis med dagens förfallande uppgifter och händelser. Den kräver Blaze-planen (som du har) och deployas separat via Firebase CLI.

## Engångsuppsättning

### 1. Installera Firebase CLI
I en terminal:
```bash
npm install -g firebase-tools
```

### 2. Logga in
```bash
firebase login
```
En webbläsare öppnas där du loggar in med samma Google-konto som Firebase.

### 3. Koppla projektet
Stå i projektmappen och kör:
```bash
firebase use --add
```
Välj `familjeapp-bb9de` i listan och ge det ett alias (t.ex. "default").

### 4. Installera funktionens beroenden
```bash
cd functions
npm install
cd ..
```

### 5. Deploya funktionen
```bash
firebase deploy --only functions
```

Första gången kan Firebase be dig aktivera några API:er, säg ja till det. Efter någon minut är funktionen live.

## Så vet du att det fungerar
- Funktionen kör automatiskt kl 07:00 varje dag
- Du ser den under Firebase Console → Functions
- Vill du testa direkt utan att vänta: i Google Cloud Console → Cloud Scheduler → hitta jobbet → "Force run"

## Bra att veta
- Funktionen skickar bara notis till familjer som faktiskt har något som förfaller den dagen
- Varje medlem måste ha aktiverat notiser (Familj-fliken) för att få dem
- Ändra tiden genom att redigera `schedule` i `functions/index.js` och deploya om
