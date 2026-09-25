# VozIt watermark worker

Burns the 3-layer VozIt watermark (bottom bar, drifting stamp, orange
end-card bumper) into a report's video after Mux finishes processing it.
Runs as its own small service on Fly.io — separate from the main Next.js
app on Vercel — because this needs sustained CPU time and FFmpeg, which
Vercel's serverless functions aren't built for.

## One-time setup (do this once)

1. **Create a Fly.io account** at fly.io if you don't have one (needs a
   payment method, but the "scale to zero" config here means it costs
   ~$0 when idle and only a few cents per video actually processed).
2. **Create a Supabase Storage bucket** named `videos`, set to **public**
   (Supabase dashboard → Storage → New bucket). This is where the
   finished watermarked video files get stored.
3. Give Claude (or whoever is deploying) either:
   - A Fly.io API token (`fly tokens create deploy`), or
   - Access to run the deploy commands below yourself.

## Environment variables the worker needs

Set these as Fly.io secrets (`fly secrets set KEY=value`), never committed:

| Variable | Value |
|---|---|
| `WATERMARK_WORKER_SECRET` | A random long string you make up — must match the same value set in the main app's Vercel environment variables |
| `SUPABASE_URL` | `https://mfanqkbhegxppyitxtye.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | The same service role key already used by the main app |
| `WATERMARK_STORAGE_BUCKET` | `videos` (optional — this is already the default) |

## Deploying

```
cd watermark-worker
fly launch --no-deploy   # first time only, creates the app on Fly.io — say no to a Postgres/Redis db if asked
fly secrets set WATERMARK_WORKER_SECRET=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
```

Once deployed, Fly.io gives you a URL like `https://vozit-watermark-worker.fly.dev`.
Set that as `WATERMARK_WORKER_URL` (and the same `WATERMARK_WORKER_SECRET`
value) in the **main app's** Vercel environment variables, then redeploy
the main app.

## What it does

`POST /process` with `{ reportId, playbackId, username, tier, duration }`
(and an `x-worker-secret` header matching `WATERMARK_WORKER_SECRET`):

1. Downloads the source video from Mux
2. Burns in the persistent bottom bar + the drifting anti-scrape stamp
3. Generates the 1.5s orange end-card bumper and appends it
4. Uploads the result to Supabase Storage
5. Returns `{ success: true, watermarkedUrl }`

The main app's `mux-webhook` route calls this (fire-and-forget) right
after a video is published, then uses the returned URL for VozIt's own
social auto-distribution and saves it on the report. Licensed "clean"
downloads don't go through this at all — that's just the original,
never-watermarked Mux master, gated by an active license (see
`/api/licensing/download` in the main app).
