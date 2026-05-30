# Familjeappen – Handoff

## Vad appen är
En familjeapp med delade listor, kalender, chatt och aktivitetsflöde. Byggd för att köra som en PWA (läggs till på hemskärmen från Safari). Familjemedlemmar bjuds in med en slumpad kod som t.ex. `GLAD-RAV-72`.

---

## Tech stack
- **Next.js 14** (App Router, `app/` mapp)
- **Firebase**: Authentication (Google + email/lösenord), Firestore (realtidsdatabas)
- **Vercel**: hosting, auto-deploy vid push till GitHub
- **GitHub-repo**: `https://github.com/pthorn8/FamiA.git`
- **Vercel-URL**: Användaren vet sin egen URL (slutar på `.vercel.app`)

Deploy-flödet: `git push` → Vercel bygger automatiskt → live inom ~1 minut.

---

## Designsystem
Alla färger och tokens definieras som CSS-variabler i `app/globals.css` med stöd för mörkt/ljust läge via `[data-theme]` på `<html>`.

```
--bg            Sidans bakgrund        #faf9f6 / mörkt: #16171f
--surface       Kort, ytor             #ffffff / mörkt: #20222d
--surface-soft  Mjukare yta            #f8f6f3
--ink           Primär text            #2D3142
--ink-soft      Sekundär text          #3D405B
--coral         Primärfärg (knappar)   #E07A5F
--sage          Grön accent            #81B29A
--sand          Gul accent             #F2CC8F
--line          Bordrar                #ececec
--muted         Nedtonad text          #999
```

Typsnitt: DM Sans (brödtext) + DM Serif Display (rubriker, `className="serif"`).

---

## Firestore-struktur

```
users/{uid}
  name, email, photoURL, createdAt, currentFamilyId

families/{familyId}
  name, inviteCode, memberIds[], members[], createdAt

families/{familyId}/lists/{listId}
  name, icon (emoji), createdAt
  items: [{ id, text, done, addedBy, assignedTo, dueDate, doneBy }]

families/{familyId}/events/{eventId}
  title, date (ISO), time, color, by, recurrence, createdAt

families/{familyId}/messages/{messageId}
  text, senderId, senderName, senderPhoto, at

families/{familyId}/activity/{activityId}
  emoji, text, by: { uid, name }, at
```

Säkerhetsregler: `firestore.rules` i projektet. Subcollections skyddas av `{sub=**}` som kräver att `request.auth.uid in memberIds`.

---

## Flikstruktur (6 flikar)
```
0  Hem 🏡         Dashboard.js    – Summeringsrutor + "Idag", "Behöver göras", aktivitet
1  Listor 📋      Lists.js        – Listor med förfallodatum, tilldelning, svep-för-att-ta-bort
2  Kalender 📅    CalendarView.js – Månads- och veckosvy, återkommande händelser
3  Chatt 💬       Chat.js         – Realtidschat, olästa-prick på fliken
4  Aktivitet 🔔   ActivityFeed.js – Automatisk logg av allt som händer
5  Familj 👥      Family.js       – Medlemmar, inbjudningskod, mörkt/ljust läge, lämna familj
```

---

## Alla filer

### `app/`
| Fil | Beskrivning |
|-----|-------------|
| `page.js` | Rotkomponent. Styr auth-flöde, fliknavigation, familjeväxlare, sökning, oläst-chat-badge |
| `layout.js` | Root layout med ThemeProvider, AuthProvider, ToastProvider, ServiceWorkerRegister |
| `globals.css` | Alla CSS-variabler, animationer, `.serif`, `.spinner`, `.skeleton`, `.backdrop`, `.sheet` |

### `components/`
| Fil | Beskrivning |
|-----|-------------|
| `Dashboard.js` | Hem-flik. Summeringsrutor "Att göra/Idag/Förfaller" (klickbara, öppnar Sheet). Visar idag-händelser, uppgifter, aktivitet |
| `Lists.js` | Listöversikt + listdetalj. SwipeRow för svep-att-ta-bort. ItemSheet för tilldelning/förfallodatum |
| `CalendarView.js` | Månadsvy + veckosvy (toggle). EventSheet för nya/redigera händelser |
| `Chat.js` | Realtidschat. VisualViewport-API för iOS-tangentbord. Meddelanden grupperas per avsändare |
| `ActivityFeed.js` | Aktivitetslogg, grupperad per dag |
| `Family.js` | Medlemmar, inbjudningskod, utseendeinställning (auto/ljust/mörkt), lämna familj |
| `Search.js` | Sökning i listobjekt + händelser. Öppnas från 🔍 i headern |
| `Login.js` | Google-inloggning (popup/redirect beroende på Safari) + email/lösenord |
| `Onboarding.js` | Skapa familj eller gå med med kod |
| `Sheet.js` | Återanvändbar bottendialog (backdrop + slideIn-animation) |
| `ServiceWorkerRegister.js` | Registrerar `public/sw.js` vid start |

### `lib/`
| Fil | Beskrivning |
|-----|-------------|
| `firebase.js` | Initierar Firebase-appen med env-variabler |
| `AuthContext.js` | useAuth hook. Google + email-auth. Safari använder signInWithRedirect |
| `ThemeContext.js` | useTheme hook. Sparar "system/light/dark" i localStorage, sätter `data-theme` på `<html>` |
| `ToastContext.js` | useToast hook. `toast.show("text")` / `toast.show("text", "error")` |
| `colors.js` | `nameColor(name)` och `memberColor(member)` – deterministiska bakgrundsfärger från namn |
| `data.js` | All Firestore-logik: familjer, listor, kalender, aktivitet, meddelanden. Exporterar `watchX` (realtid) och mutationsfunktioner |

### `public/`
`sw.js` (service worker, offline-caching), `manifest.json` (PWA), ikoner (192/512px), favicon.

---

## Vad som är implementerat
- ✅ Google-inloggning + email/lösenord (Safari-fix med redirect)
- ✅ Skapa / gå med i familj med inbjudningskod
- ✅ Flera familjer per användare, växla i headern
- ✅ Delade listor med realtidssynk
- ✅ Svep för att ta bort listobjekt
- ✅ Tilldela uppgifter till familjemedlemmar
- ✅ Förfallodatum med överdue-markering i rött
- ✅ Kalender med månadsvy och veckosvy
- ✅ Återkommande händelser (dag/vecka/månad/år)
- ✅ Realtidschat med iOS-tangentbordsfix via visualViewport
- ✅ Olästa-prick på Chatt-fliken
- ✅ Aktivitetsflöde (allt loggas automatiskt)
- ✅ Mörkt läge (auto/ljust/mörkt, sparas i localStorage)
- ✅ Sökning i listor och kalender
- ✅ Dashboard med klickbara summeringsrutor
- ✅ Toast-notiser för feedback
- ✅ Offline-stöd via service worker
- ✅ PWA – kan installeras på hemskärmen

---

## Kvarstår / möjlig roadmap
- [ ] **Push-notiser** via Firebase Cloud Messaging. Kräver Blaze-plan (betalkort, men gratis upp till hög gräns) + Cloud Functions för att skicka vid Firestore-ändringar
- [ ] **Måltidsplanering** – veckans mat, automatisk inköpslista
- [ ] **Drag-och-släpp** för att sortera om listor och uppgifter
- [ ] **Bilder i chatten** – kräver Firebase Storage
- [ ] **Sökning öppnar rätt objekt direkt** (deep link till specifik lista/händelse)
- [ ] **Statistik** – "Vi klarade X saker den här veckan"
- [ ] **Kategorier/taggar** på listobjekt
- [ ] **Redigera händelse** (ej bara ta bort)

---

## Konventioner att hålla
- Alla färger via CSS-variabler, aldrig hårdkodade hex
- `className="serif"` för rubriker med DM Serif Display
- Bottendialoger via `<Sheet onClose={fn}>` komponenten
- Toast-feedback via `const toast = useToast(); toast.show("text")`
- Aktivitetslogg via `logActivity(familyId, user, "emoji", "text")` i data.js
- Realtidslyssnare returnerar alltid en unsub-funktion, anropas i useEffect cleanup
- Animationer: `animation: "slideIn 0.25s ease"` för nya sektioner

---

## Att tänka på
- Chatten behöver ett Firestore-composite index på `messages` (fältet `at` descending). Firebase skapar det automatiskt första gången med en länk i konsolen.
- Inloggning med Google på Safari/iPhone använder `signInWithRedirect` istället för popup (finns i AuthContext).
- Firebase authorized domains: Vercel-domänen måste läggas till i Firebase → Authentication → Settings → Authorized domains.
