# ig-anket

A mobile survey page for research interviews. Participants answer by text or by voice. The answers go to a private Google Sheet, and the voice recordings go to a private Google Drive folder of the owner. This repository contains only the page and the questions. It contains no answers.

## Parts

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | The page (GitHub Pages). |
| `questions.js` | The questions of the three surveys: `uretici`, `ajans`, `marka`. |
| `config.js` | The URL of the Apps Script web app. |
| `apps-script/Code.gs` | The backend. It runs in the Apps Script project of the Sheet. |

## How it works

- Each participant gets a personal link: `https://oguzsezer.github.io/ig-anket/?t=<key>`. The "Katılımcılar" tab of the Sheet holds the keys and the links.
- The page saves each answer when the participant types or records it. The participant can stop and continue later with the same link.
- When the participant sends the answers, the backend sets the state to "kilitli". After that, the backend rejects all changes.
- To open a locked form again, set the "Durum" cell to "açık".

## Preview without the backend

Open `?t=demo-uretici`, `?t=demo-ajans` or `?t=demo-marka`. The demo keeps data only in the browser.

## Set up the backend (one time)

1. Open the Sheet "Anket yanıtları". Select Extensions > Apps Script.
2. Replace the contents of `Code.gs` with `apps-script/Code.gs`. Save.
3. Select Deploy > New deployment > Web app. Set "Execute as" to "Me" and "Who has access" to "Anyone". Select Deploy and give the permissions.
4. Copy the web app URL (it ends with `/exec`) into `config.js`. Push.

After a change to `Code.gs`, select Deploy > Manage deployments > Edit > New version. The URL stays the same.
