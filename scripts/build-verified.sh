#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "${script_dir}/.." && pwd)"

if command -v rg >/dev/null 2>&1; then
  retired_wording_found="$(rg -n -i "pacifica[[:space:]]+insurance[[:space:]]+crm" "${project_dir}/app" || true)"
else
  retired_wording_found="$(grep -RInE "pacifica[[:space:]]+insurance[[:space:]]+crm" "${project_dir}/app" || true)"
fi

if [[ -n "${retired_wording_found}" ]]; then
  printf '%s\n' "${retired_wording_found}"
  echo "Blocked release: retired product wording remains in app source." >&2
  exit 65
fi

# Vercel needs a native Next.js build. The same repository is also deployed
# through ChatGPT Sites, which uses the Vinext/Cloudflare artifact below.
if [[ "${VERCEL:-}" == "1" ]]; then
  next_bin="${project_dir}/node_modules/.bin/next"
  if [[ ! -x "${next_bin}" ]]; then
    echo "Next.js is unavailable. Install dependencies before building." >&2
    exit 69
  fi
  echo "Running Vercel-compatible Next.js build..."
  exec "${next_bin}" build --webpack
fi

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  # Run through bash explicitly so GitHub web uploads do not need to preserve
  # executable file modes for this script.
  exec bash "${script_dir}/sites-env.sh" -- bash "$0" "$@"
fi

command -v timeout >/dev/null || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

echo "Running bounded vinext build..."
timeout \
  --signal=TERM \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  "${SITES_BUILD_TIMEOUT:-3m}" \
  "${vinext}" build

bash "${script_dir}/validate-artifact.sh"
