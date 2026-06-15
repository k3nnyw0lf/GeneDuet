# Security & Privacy Policy

GeneDuet handles genetic data — the most sensitive data there is. Its design goal is
that **your DNA never leaves your device.**

## How privacy is enforced

- **No server, no upload, no account.** Raw files are parsed entirely in the browser.
- **Strict Content-Security-Policy** in `web/index.html`: `default-src 'none'` blocks all
  network access. The *only* exception is the optional AI chat, which may call your own
  **local Ollama** at `http://localhost:11434` — i.e. still on your machine, never the cloud.
- **Real data stays out of the repo.** The `private/` folder (raw DNA, generated reports,
  downloaded reference files) is gitignored and must never be committed.
- **CLI tools** read files you point them at and print only computed results.

## What it is and isn't

GeneDuet is **educational, not a medical device and not a legal paternity test.** Consumer
genotyping arrays miss rare variants; some markers (palindromic SNPs, HLA-driven scores,
CYP2D6) are deliberately flagged as not reliably callable rather than guessed.

## Reporting a vulnerability

If you find a privacy or security issue (e.g. a code path that could exfiltrate data, or a
CSP bypass), please open a GitHub issue describing it, or contact the repository owner
privately. Please do **not** include anyone's real genetic data in a report.

## For users

- Treat your raw DNA file like a password — it identifies you and your relatives.
- Be cautious uploading DNA to *any* third-party service. GeneDuet's whole point is that you
  don't have to: it runs locally and you can read the source.
