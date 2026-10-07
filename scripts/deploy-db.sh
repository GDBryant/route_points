#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase db push
if [[ "${1:-}" == "--types" ]]; then
  npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > src/lib/database.types.ts
  echo "types regenerated"
fi
echo "Done. Set VITE_SUPABASE_URL=https://$SUPABASE_PROJECT_REF.supabase.co and VITE_SUPABASE_ANON_KEY in your host env."
