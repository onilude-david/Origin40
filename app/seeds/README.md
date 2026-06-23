# Origin40 Production Seeds

The live Vercel app starts with an empty SQLite database because serverless storage is temporary.
Committed seed files safely restore public/program data such as mentors, featured speakers, and
program leads.

Applicant data contains private names, emails, and phone numbers, so do not commit applicant exports
to the repository. For production, set this Vercel environment variable:

```text
ORIGIN40_APPLICANTS_CSV_B64
```

Value: base64 of the Fluent Forms CSV export.

PowerShell helper:

```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content "C:\Users\onilu\Downloads\Origin40-Founder-Application-2026-06-23.csv" -Raw)))
```

After the env var is set and the app redeploys, the first API request bootstraps applicants into the
temporary production database. A proper persistent database such as Supabase should replace this for
long-term production use.
