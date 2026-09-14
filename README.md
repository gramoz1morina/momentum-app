# Momentum IF medlemsapp

Första testversionen för iOS och Android, byggd med React Native och Expo SDK 57.

## Vad fungerar nu?

- Mörk design med föreningens färger och Source Sans 3.
- Hem, sjudagarskalender, grupp, profil och en förhandsvisning av admin.
- Riktig QR-läsning med kamera och en separat knapp för simulerad skanning.
- Matchning mot pågående eller nästa pass samma dag i Europe/Stockholm.
- Byte av felaktigt valt pass och incheckning på flera pass.
- En rad per medlem och pass-id; omskanning skapar inga dubbletter.
- Testincheckningar sparas lokalt på enheten och visas per pass i admin.

## Testversion, inte produktionsklar

Appen använder en påhittad medlem och ett exempelschema. Ett extra kvällspass läggs in varje dag för att underlätta test. Inget skickas till föreningen. Adminvyn är en öppen demo, inte en behörighetskontroll. Inloggning, medlemsregister, betalningsbekräftelse, verkliga meddelanden, redigering av schema och push-notiser byggs i nästa etapp. Betalning och externa anmälningslänkar är avstängda tills riktiga uppgifter finns.

En statisk QR-kod bevisar inte fysisk närvaro. I produktionsversionen ska servern validera medlem, lokal och pass samt garantera unik `(member_id, session_id)`. Telefonens klocka och klientens roller ska inte vara auktoritativa. Grupper och barnmedlemmars synlighet behöver bestämmas innan medlemsregistret öppnas.

## Testa QR-flödet

Öppna `docs/test-qr.svg` på en annan skärm, eller skriv ut den. QR-innehållet är `momentum-if:checkin:demo:v1`. Koden är enbart för testversionen.

1. Öppna Checka in och tillåt kamera.
2. Skanna testkoden. Pågående pass prioriteras, därefter närmast kommande idag.
3. Om alla pass är slut väljer du manuellt bland dagens pass.
4. Testa Fel pass och Checka in på fler.
5. Kontrollera dagens statistik i Admin. Skanna igen: antalet ska inte dubbleras.
6. Starta om appen: incheckningarna ska finnas kvar.

Kamera, behörighetsdialoger och installation behöver fortfarande verifieras på riktiga iOS- och Android-enheter.

## Bygga utan installation på egen dator

Det befintliga EAS-projekt-id:t är bevarat: `a9c557aa-9191-40b8-b630-aed74360fde3`.
Paketidentifieraren är förberedd som `se.momentumif.app` för båda plattformarna. Kontrollera den mot eventuella befintliga signeringsuppgifter innan första bygget.

Profiler:

- `preview`: fristående intern testapp, Android APK respektive registrerad iOS-enhet. Behöver ingen lokal utvecklingsserver.
- `simulator`: iOS-simulatorbygge, inte installerbart på iPhone.
- `development`: utvecklingsklient, kräver en tillgänglig Metro-server för vanlig utveckling.
- `production`: butiksbygge. Testversionen ska inte skickas till butikerna.

Expo beskriver ett första lyckat EAS-bygge per plattform som förutsättning för GitHub-byggflödet. Om den första konfigureringen kräver CLI kan den göras i GitHub Codespaces direkt i webbläsaren. Du installerar då inget på din egen dator. Logga in på Expo och Apple i deras egna inloggningsflöden; lägg inte lösenord eller tokens i repot eller chatten.

I en Codespace, när du vill starta första molnbygget:

```sh
npm ci
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile preview
# För Android:
npx eas-cli@latest build --platform android --profile preview
```

EAS kan be om Apple Developer-konto, registrering av iPhone och signeringsuppgifter. Android behöver en keystore. Byggen kan använda ditt Expo-kontos byggkvot. Därefter går det att välja gren, plattform och profil under Build from GitHub i Expo. Inga byggen eller butikspubliceringar startas automatiskt av detta repo.

Officiell guide: https://docs.expo.dev/build/building-from-github/

## Utveckling och kontroll

```sh
npm ci
npm test
npx expo install --check
npx expo export --platform all
```

Nästa etapp: backend med inloggning, medlemskap och roller; adminhantering; manuella Swish-bekräftelser; privata instruktörstrådar; serverstyrd incheckning; push med logg. Appikon och butiksmaterial återstår.
