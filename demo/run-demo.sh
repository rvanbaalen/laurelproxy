#!/bin/bash
# RoxyProxy Demo — polished asciinema recording
# Real proxy data, simulated AI coding agent UI

# --- Colors ---
RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
MAGENTA='\033[1;35m'
CYAN='\033[1;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# --- Helpers ---

type_text() {
  local text="$1"
  local delay="${2:-0.04}"
  for (( i=0; i<${#text}; i++ )); do
    printf '%s' "${text:$i:1}"
    sleep "$delay"
  done
}

# Show a shell prompt, type command, run it
shell_prompt() {
  printf "${GREEN}❯ ${RESET}"
}

# Agent prompt (simulates an AI coding agent input)
agent_input() {
  echo ""
  printf "${MAGENTA}You: ${RESET}"
}

# Agent "thinking" with spinner
agent_think() {
  printf "${DIM}"
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  for round in 1 2 3 4 5 6; do
    for frame in "${frames[@]}"; do
      printf "\r  ${frame} Thinking..."
      sleep 0.08
    done
  done
  printf "\r                    \r"
  printf "${RESET}"
}

# Agent response text (supports inline ANSI codes)
agent_say() {
  printf "  ${CYAN}▌${RESET} "
  # Print word by word for natural pacing, preserving ANSI codes
  local words=($1)
  for word in "${words[@]}"; do
    printf '%b ' "$word"
    sleep 0.06
  done
  echo ""
}

# Agent tool use block
agent_tool() {
  echo ""
  printf "  ${DIM}┌─ ${YELLOW}⚡ Tool: ${RESET}${WHITE}$1${RESET}\n"
  printf "  ${DIM}│${RESET}  ${CYAN}$2${RESET}\n"
  printf "  ${DIM}└──────${RESET}\n"
  sleep 0.5
}

# Print colored JSON-like output (simplified, not actual JSON)
print_agent_output() {
  echo ""
  printf "  ${DIM}│${RESET}\n"
  printf "  ${DIM}│${RESET}  ${WHITE}${BOLD}POST${RESET} ${BLUE}https://httpbin.org/status/422${RESET} ${RED}→ 422${RESET} ${DIM}(347ms)${RESET}\n"
  printf "  ${DIM}│${RESET}\n"
  printf "  ${DIM}│${RESET}  ${YELLOW}Request${RESET}\n"
  printf "  ${DIM}│${RESET}  ${DIM}Content-Type:${RESET} application/json\n"
  printf "  ${DIM}│${RESET}  ${DIM}Body:${RESET}         ${WHITE}{\"webhook_id\": \"evt_123\", \"type\": \"payment.failed\"}${RESET}\n"
  printf "  ${DIM}│${RESET}\n"
  printf "  ${DIM}│${RESET}  ${YELLOW}Response${RESET}\n"
  printf "  ${DIM}│${RESET}  ${DIM}Status:${RESET}       ${RED}422 Unprocessable Entity${RESET}\n"
  printf "  ${DIM}│${RESET}  ${DIM}Server:${RESET}       gunicorn/19.9.0\n"
  printf "  ${DIM}│${RESET}  ${DIM}Error:${RESET}        ${RED}true${RESET}\n"
  printf "  ${DIM}│${RESET}\n"
}

# --- Resolve roxyproxy binary ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$REPO_ROOT/dist/cli/index.js" ]; then
  ROXY="node $REPO_ROOT/dist/cli/index.js"
elif command -v roxyproxy &>/dev/null && roxyproxy --version &>/dev/null; then
  ROXY="roxyproxy"
else
  echo "Error: roxyproxy not found. Run 'npm run build' first."
  exit 1
fi

# --- Pre-record: capture real traffic (hidden from recording) ---
$ROXY stop --ui-port 8081 2>/dev/null || true
pkill -f "dist/cli/index.js start" 2>/dev/null || true
sleep 0.5
$ROXY start --port 8080 --ui-port 8081 &>/dev/null &
sleep 2
curl -s -x http://127.0.0.1:8080 -X POST https://httpbin.org/status/422 \
  -H 'Content-Type: application/json' \
  -d '{"webhook_id":"evt_123","type":"payment.failed"}' -o /dev/null 2>/dev/null
sleep 1
pkill -f "dist/cli/index.js start" 2>/dev/null || true
sleep 1

# ============================================================
# VISIBLE DEMO STARTS HERE
# ============================================================
clear
echo ""
sleep 0.8

# --- Scene 1: The failing request ---
printf "${DIM}# A webhook call is failing in production...${RESET}\n"
sleep 1.2
echo ""

shell_prompt
type_text "curl -X POST https://httpbin.org/status/422 -H 'Content-Type: application/json' -d '{\"webhook_id\":\"evt_123\"}'" 0.025
sleep 0.4
echo ""
sleep 0.3
printf "${RED}HTTP/1.1 422 Unprocessable Entity${RESET}\n"
sleep 1.5

# --- Scene 2: Ask the AI agent ---
agent_input
sleep 0.3
type_text "My webhook POST to httpbin.org keeps returning a 422. Traffic is going through roxyproxy — can you find out what's wrong?" 0.025
sleep 0.6
echo ""
echo ""

# --- Scene 3: Agent thinks and acts ---
agent_think
echo ""
agent_say "Let me check the captured traffic for failing requests."
sleep 0.5

agent_tool "Bash" "roxyproxy requests --host httpbin.org --failed --format agent"

# Show colorized output (simulated from real data)
print_agent_output
sleep 2.5

# --- Scene 4: Agent diagnosis ---
echo ""
agent_say "Found it. Your POST to ${BLUE}httpbin.org/status/422${RESET} is being rejected"
agent_say "with a ${RED}422 Unprocessable Entity${RESET}."
sleep 0.4
echo ""
agent_say "The request body sends ${WHITE}webhook_id${RESET} and ${WHITE}type${RESET} fields, but the"
agent_say "endpoint returns an empty body. This is a schema validation"
agent_say "failure — the server understood your request but won't process it."
sleep 0.6
echo ""
agent_say "${YELLOW}Fix:${RESET} Check if the endpoint requires additional fields beyond"
agent_say "${WHITE}webhook_id${RESET} and ${WHITE}type${RESET}. Compare your payload against the API docs."
sleep 2

# --- Closing ---
echo ""
echo ""
printf "${DIM}────────────────────────────────────────────────────────────${RESET}\n"
printf "${BOLD}One prompt. Zero manual steps.${RESET}\n"
printf "${DIM}roxyproxy — the HTTP proxy your AI agent can use${RESET}\n"
sleep 3
