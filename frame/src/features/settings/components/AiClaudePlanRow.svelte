<script lang="ts">
  import { commands } from "$shared/ipc/bindings";
  import { type ModelsSession, keyState } from "$domain/ai";
  import * as m from "$shared/i18n/messages";
  import Button from "$shared/ui/Button";
  import ProviderMark from "$shared/ui/ProviderMark";
  import SettingsGroup from "$shared/ui/SettingsGroup";

  /** The person's own Claude Code CLI, which runs Work on their Claude plan. */
  let { session }: { session: ModelsSession } = $props();

  const INSTALL_URL = "https://code.claude.com/docs/en/setup";

  const models = $derived(session.models);
  const row = $derived(models?.providers.find((row) => row.provider === "claude_cli") ?? null);
  const key = $derived(keyState(models, "claude_cli"));
  const installed = $derived(row?.installed === true);
  const checking = $derived(session.busy === "test:claude_cli");
  let failed = $state(false);

  const status = $derived.by((): { text: string; tone: "ok" | "warn" | "off" } => {
    if (key === "set" || key === "valid")
      return {
        text: row?.account
          ? m.ai_claude_plan_signed_in_as({ account: row.account })
          : m.ai_claude_plan_signed_in(),
        tone: "ok",
      };
    if (key === "invalid") return { text: m.ai_claude_plan_refused(), tone: "warn" };
    if (installed) return { text: m.ai_claude_plan_signed_out(), tone: "warn" };
    return { text: m.ai_claude_plan_missing(), tone: "off" };
  });

  async function check() {
    failed = false;
    failed = !(await session.testKey("claude_cli"));
  }

  function install() {
    void commands.browserOpenUrl(INSTALL_URL, true).catch(() => (failed = true));
  }
</script>

{#if row}<SettingsGroup title={m.ai_claude_plan_group()} description={m.ai_claude_plan_note()}>
    <div class="plan-row">
      <span class="tile" aria-hidden="true"><ProviderMark provider="claude_cli" size={20} /></span>
      <div class="copy">
        <h3>{m.ai_claude_plan_title()}</h3>
        <p class="status" data-tone={status.tone} role="status">
          <span class="dot" aria-hidden="true"></span>{status.text}
        </p>
      </div>
      <div class="actions">
        {#if !installed && key === "missing"}<Button
            size="compact"
            variant="primary"
            onclick={install}>{m.ai_claude_plan_install()}</Button
          >{/if}
        <Button
          size="compact"
          variant={key === "set" || key === "valid" ? "ghost" : "secondary"}
          pending={checking}
          disabled={!!session.busy}
          onclick={() => void check()}>{m.ai_claude_plan_check()}</Button
        >
      </div>
    </div>
    {#if failed}<p class="message" role="alert">{m.ai_claude_plan_check_failed()}</p>{/if}
  </SettingsGroup>{/if}

<style>
  /* Metrics match AiProviderRow so the page reads as one list. */
  .plan-row {
    display: flex;
    align-items: center;
    gap: 12px;
    box-sizing: border-box;
    min-height: var(--row-page);
    padding: 12px 18px 12px 14px;
  }

  .tile {
    display: grid;
    flex: none;
    inline-size: 32px;
    block-size: 32px;
    border-radius: var(--radius-control);
    background: var(--color-fill);
    color: var(--color-text);
    place-items: center;
  }

  .copy {
    flex: 1;
    min-width: 0;
  }

  h3 {
    margin: 0;
    color: var(--color-text);
    font-size: var(--text-page-title);
    font-weight: 500;
    line-height: 19px;
    letter-spacing: -0.008em;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 2px 0 0;
    color: var(--color-muted);
    font-size: var(--text-label);
    line-height: 1.5;
  }

  .dot {
    flex: none;
    inline-size: 6px;
    block-size: 6px;
    border-radius: 50%;
    background: var(--color-muted);
  }

  .status[data-tone="ok"] .dot {
    background: var(--color-success);
  }

  .status[data-tone="warn"] .dot {
    background: var(--color-warning);
  }

  .actions {
    display: flex;
    flex: none;
    gap: 6px;
  }

  .message {
    margin: 0 18px 12px 58px;
    color: var(--color-danger);
    font-size: var(--text-label);
    line-height: 1.5;
  }
</style>
