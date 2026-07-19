# EchoClass web app — setup notes

## Firestore security rules (paste in step 2 below)

Firebase Console → Firestore Database → **Rules** tab → replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /echoclass_attempts/{attemptId} {
      allow create: if true;
      allow read: if true;
      allow update, delete: if false;
    }
  }
}
```

This lets any device create a new result and lets the teacher dashboard read all
results, but nobody can edit or delete a submitted result. There's no login —
matches the "demo only, no auth" decision in the handoff. Click **Publish** after pasting.

## Turning on GitHub Pages (one-time)

1. On GitHub, go to the `echoclass-audio` repo → **Settings** → **Pages** (left sidebar).
2. Under "Build and deployment" → **Source**, choose **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Click **Save**.
4. After a minute or two, GitHub shows the live URL — it'll look like
   `https://jarradkevin.github.io/echoclass-audio/`.

## The two links

- **Students:** `https://jarradkevin.github.io/echoclass-audio/webapp/`
- **Teacher dashboard:** `https://jarradkevin.github.io/echoclass-audio/webapp/teacher.html`

Both work for anyone with the link, no login — intentional for this pilot.
