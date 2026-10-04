# SALESly

**Upload. Diagnose. Improve. Sell.** A responsive Next.js MVP for TikTok Shop, affiliate and online sellers. Built from the supplied SALESly dashboard reference.

## Run locally

Requires Node.js 20.9+ (Node 22 LTS recommended) and pnpm.

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp` if preferred. Open <http://localhost:3000>.

The example environment enables **demo mode**. It exercises the real upload, frame extraction, API routes, validation, strategy selection and prompt-copy workflow using clearly labelled sample diagnosis and template prompts. It does **not** analyze the uploaded video with AI. There is no silent fallback to demo after an AI error.

To enable live analysis, set these **server environment variables** and restart:

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-6-luna
SALESly_MOCK_MODE=false
MAX_VIDEO_SECONDS=60
```

Never prefix the key with `NEXT_PUBLIC_`, put it in client code, or commit it. `.env*` files are ignored except the empty `.env.example`. No API key is included in this project. `MAX_VIDEO_SECONDS` is clamped to 1–120 seconds; default 60. Maximum local file size is 150 MB. Duration is normalized to millisecond precision.

## What works

- MP4/MOV picker and drag-and-drop, file/duration validation, local playback, progress and cancellation.
- Browser HTML5 video + canvas extraction of 10 timestamped JPEG frames across the full timeline; longest edge 448 px, quality 0.65. Raw video never leaves the browser.
- Product name, RM price, audience, verified benefits and four platform choices.
- `/api/analyze`: frame-based diagnosis, heuristic conversion score, all 16 evaluation dimensions, strengths, weaknesses, three WHAT/WHY/HOW problems, continuous timeline, recommendations, grounded facts and exactly seven distinct strategy cards.
- `/api/generate-angle`: only the selected strategy gets full prompts. Scene-level action, product, framing, expressions, dialogue, purpose and all production/negative instructions are included. Each part is at most 10 seconds; parts and scenes must cover the original duration without gaps or overlaps.
- Full copy for each part, manual-copy fallback, back navigation, reselecting another angle and in-memory caching of generated angles.
- Server-only OpenAI Responses API, strict structured output, Zod validation, input limits, origin checks, best-effort throttling, signed analysis context and clean error messages.
- Responsive desktop/mobile layouts, keyboard focus, modal focus containment, reduced-motion support and no account, payment or database.

## Architecture

```text
Browser video → 10 resized frames + timestamps + product metadata
             → POST /api/analyze → diagnosis + 7 concise angles
             → select one angle
             → POST /api/generate-angle → validated <=10s prompt parts
```

`lib/video.ts` owns media extraction, independent from the UI. `lib/contracts.ts` owns runtime schemas, timeline checks and prompt formatting. `lib/server.ts` is marked `server-only`; it contains the OpenAI client and request safeguards. `lib/demo.ts` provides deterministic development fixtures. `components/dashboard.tsx` owns the session-only workflow.

Analysis context is signed server-side and expires after two hours. The generation route accepts its token plus an angle ID; users cannot replace live analysis, product facts or duration by editing the client request. Tokens contain readable analysis/product data, not secrets. Treat tokens as private session data. No frames are embedded in them. Requests use `store: false` for OpenAI Responses; this does not override the provider's API data retention policies.

## Deploy on Vercel

1. Import this directory as a Git repository/project, or use the Vercel CLI from this directory.
2. Select the **Next.js** framework. Install command: `pnpm install --frozen-lockfile`. Build command: `pnpm build`. Keep the default Next.js output settings.
3. Set `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-6-luna`, `SALESly_MOCK_MODE=false` and `MAX_VIDEO_SECONDS=60` in Vercel's server environment. For a demo deployment, set `SALESly_MOCK_MODE=true` and omit the key.
4. Optionally set `APP_ORIGIN` to your exact public origin, without a trailing slash. Leave unset for preview deployments with different hostnames; the request host is used by default.
5. Deploy and test with a short, non-sensitive product video. Both API routes use the Node.js runtime with a 120-second maximum duration; ensure the selected Vercel plan permits this duration.

Request bodies are bounded to 1.5 MB for analysis and 200 KB for generation. Only small frames are submitted, avoiding raw-video function payloads. Development and production use separate build directories so a running preview does not conflict with a production build.

**Public usage and costs:** the built-in memory-only throttle allows 12 requests/minute/IP per warm process. It is not a global abuse-control or spend limit and resets on cold starts. Before exposing a live key to a public audience, configure Vercel Firewall/rate limiting or Deployment Protection and OpenAI project budget alerts. No database or login has been introduced. Aborting the browser stops waiting, but a server/OpenAI request already underway may still finish and incur cost.

## Validation

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

Contract tests check all seven angles at 1, 8, 10, 10.01, 16, 26, 40, 59.987 and 120 seconds; they reject gaps, overlaps, incomplete parts, invalid price/frame data and out-of-range durations.

Browser QA completed with a generated 25.947-second MP4: playable upload, 10 distinct resized JPEG frames, ~81 KB request payload, diagnosis, three prompt parts, full clipboard copy, another-angle navigation, 1440px desktop and 390px mobile, corrupt-file rejection, tampered-session rejection, cross-origin rejection and invalid server duration rejection. The UI produced no browser runtime errors. Production build succeeds.

**Verification limits:** live OpenAI calls were not run because no API key was configured. A Vercel deployment has not been created from this environment. The production build and standard Node.js route configuration are ready for deployment, but deployment credentials, plan limits and live model access must be verified in your account.

## Intentional MVP limits

- Still frames cannot establish original spoken dialogue, audio quality or exact motion/retention. Dialogue is explicitly unassessed. Scores are creative heuristics, not measured conversion rates or promised sales.
- MOV is a container: decoding depends on the browser/codec. Unsupported files show a clear error; export as H.264 MP4 and retry.
- Product appearance is not proof of ingredients, certification, medical efficacy, reviews or other invisible claims. Prompts instruct the model to use grounded facts and avoid unsupported claims; review generated copy before publishing.
- Audio/transcription is not implemented. A future `TranscriptSegment[]` with start/end/text and provenance can be added alongside `frames` in the media result, request schema and AI input. Do not mark dialogue assessed until that evidence is present.
- Prompts are generated; video rendering happens in the user's chosen video tool. Supply original product imagery there to preserve exact appearance.
- Workspace state is memory-only and clears on refresh. No video library, accounts, billing or persistent storage.

## API references

- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Images and vision](https://developers.openai.com/api/docs/guides/images-vision)
