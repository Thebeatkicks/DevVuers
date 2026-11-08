## Vecka 7

### Dator har förberetts:
Windows, Node 22 (via nvm-windows), Core Tools v4. func start / npm start fungerar och HttpExample svarar “Hello world” lokalt.

**Problem och lösningar:**

Hade Node 25 från början, vilket inte fungerar. Behövde byta till Node 22.
nvm-windows-installern vägrade köra med befintlig Node installerad i C:\Program Files\nodejs. Löstes genom att avinstallera Node via inställningar och köra installern igen.

Vad utelämnas: Quickstarten säger inte vilka Node-versioner som stöds.

Svar: Azure Functions stöder bara vissa Node-versioner. Just nu är Node 22 den senaste GA-versionen, Node 24 är preview och Node 25 stöds inte. Därför fungerade inte Node 25 hos mig.

Källa: Microsoft Learn, "Supported languages in Azure Functions", avsnittet om Node.js-versioner:
https://learn.microsoft.com/azure/azure-functions/supported-languages