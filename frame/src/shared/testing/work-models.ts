import type {
  WorkKeyStateV1,
  WorkModelEntry,
  WorkModelProvider,
  WorkModelReasoning,
  WorkModelRole,
  WorkModelsV1,
} from "$shared/ipc/bindings";

const WIRE = {
  anthropic: "anthropic_messages",
  open_ai: "open_ai_responses",
  google: "gemini",
  deep_seek: "chat_completions",
  open_router: "chat_completions",
  xai: "open_ai_responses",
  mistral: "chat_completions",
  groq: "chat_completions",
  cerebras: "chat_completions",
  compatible: "chat_completions",
  cloud: "anthropic_messages",
  claude_cli: "anthropic_messages",
} as const;

const SLUG = {
  anthropic: "anthropic",
  open_ai: "openai",
  google: "google",
  deep_seek: "deepseek",
  open_router: "openrouter",
  xai: "xai",
  mistral: "mistral",
  groq: "groq",
  cerebras: "cerebras",
  compatible: "compatible",
  cloud: "zephium",
  claude_cli: "claude-cli",
} as const;

export function entry(
  provider: WorkModelProvider,
  model: string,
  name: string,
  recommended: boolean,
  roles: WorkModelRole[] = ["lead", "page", "light"],
  details: Partial<WorkModelEntry> = {},
): WorkModelEntry {
  return {
    id: `${SLUG[provider]}/${model}`,
    model: { provider, wire: WIRE[provider], model },
    display_name: name,
    roles,
    recommended,
    context_window: 1_000_000,
    max_output: 128_000,
    supports: {
      tools: true,
      vision: true,
      prompt_cache: true,
      reasoning: true,
      native_search: true,
    },
    price: { input: 2_000_000, cached_input: 200_000, output: 10_000_000 },
    ...details,
  };
}

const usd = (input: number, output: number) => ({
  input: input * 1_000_000,
  cached_input: input * 100_000,
  output: output * 1_000_000,
});
const blind = {
  tools: true,
  vision: false,
  prompt_cache: true,
  reasoning: true,
  native_search: false,
};

const builtin: WorkModelEntry[] = [
  entry("anthropic", "claude-opus-5-5", "Claude Opus 5.5", true, ["lead"], { price: usd(4, 20) }),
  entry("anthropic", "claude-sonnet-5-5", "Claude Sonnet 5.5", true, ["lead", "page"]),
  entry("anthropic", "claude-haiku-4-5-20251001", "Claude Haiku 4.5", true, ["page", "light"], {
    context_window: 200_000,
    price: usd(1, 5),
  }),
  entry("anthropic", "claude-fable-5-1", "Claude Fable 5.1", false, ["lead"], {
    price: usd(10, 50),
  }),
  entry("open_ai", "gpt-6-luna", "GPT-6 Luna", true, ["lead", "page", "light"], {
    context_window: 1_050_000,
    price: usd(0.1, 0.5),
  }),
  entry("open_ai", "gpt-6-sol", "GPT-6 Sol", true, ["lead", "page"], { context_window: 1_050_000 }),
  entry("open_ai", "gpt-6-astra", "GPT-6 Astra", false, ["lead"], {
    context_window: 1_050_000,
    price: usd(10, 50),
  }),
  entry("google", "gemini-3.1-pro-preview", "Gemini 3.1 Pro", true, ["lead"], {
    context_window: 1_048_576,
    price: usd(2, 12),
  }),
  entry("google", "gemini-3.8-flash", "Gemini 3.8 Flash", true, ["lead", "page"], {
    context_window: 1_048_576,
    price: usd(0.75, 3.75),
  }),
  entry("deep_seek", "deepseek-v4-pro", "DeepSeek V4 Pro", true, ["lead"], {
    supports: blind,
    price: usd(1.32, 3.96),
  }),
  entry("open_router", "anthropic/claude-sonnet-5.5", "Claude Sonnet 5.5", true, ["lead", "page"], {
    supports: { ...blind, vision: true },
  }),
];

const ALL: WorkModelReasoning[] = ["low", "medium", "high", "xhigh", "max"];

/** What Rust offers each fixture model as a lead (`models::efforts`). */
function levels(item: WorkModelEntry): WorkModelReasoning[] {
  const model = item.model.model;
  switch (item.model.provider) {
    case "anthropic":
    case "cloud":
      return model.startsWith("claude-haiku-4") ? ["low", "medium", "high"] : ALL;
    case "open_ai":
      return model.startsWith("gpt-6") ? ALL : ["low", "medium", "high"];
    case "google":
    case "open_router":
      return ["low", "medium", "high"];
    case "deep_seek":
      return ["low", "high"];
    default:
      return [];
  }
}

export const PROFILE = "00000000000000000000000001";

export function models(options: {
  keys?: Partial<Record<WorkModelProvider, WorkKeyStateV1>>;
  cloud?: boolean;
  base?: string;
  lead?: string | null;
  chosen?: string | null;
  effort?: WorkModelReasoning;
  /** The person's own Claude Code CLI, as Settings lists it. */
  claudeCli?: { installed: boolean; key?: WorkKeyStateV1; account?: string };
}): WorkModelsV1 {
  const plan = options.claudeCli
    ? [
        entry("claude_cli", "claude-opus-5-5", "Claude Opus 5.5", true, ["lead"]),
        entry("claude_cli", "claude-haiku-5-5", "Claude Haiku 5.5", true, ["page", "light"]),
      ]
    : [];
  const cloud = options.cloud
    ? [entry("cloud", "claude-sonnet-5-5", "Claude Sonnet 5.5", true, ["lead", "page"])]
    : [];
  const efforts = [...cloud, ...builtin]
    .map((item) => ({ id: item.id, levels: levels(item) }))
    .filter((row) => row.levels.length);
  const lead = efforts.find((row) => row.id === options.lead)?.levels;
  return {
    version: 1,
    profile: PROFILE,
    entries: [...cloud, ...builtin, ...plan],
    chosen: { lead: options.chosen ?? null, page: null, light: null },
    effective: { lead: options.lead ?? null, page: null, light: null },
    providers: (
      [
        "anthropic",
        "open_ai",
        "google",
        "xai",
        "mistral",
        "deep_seek",
        "groq",
        "cerebras",
        "open_router",
        "compatible",
      ] as const
    )
      .map((provider): WorkModelsV1["providers"][number] => ({
        provider,
        key: options.keys?.[provider] ?? "missing",
        base: provider === "compatible" ? (options.base ?? null) : null,
      }))
      .concat(
        options.claudeCli
          ? [
              {
                provider: "claude_cli",
                key: options.claudeCli.key ?? "missing",
                base: null,
                account: options.claudeCli.account ?? null,
                installed: options.claudeCli.installed,
              },
            ]
          : [],
      ),
    cloud: {
      signed_in: !!options.cloud,
      plan: options.cloud ? "Pro" : null,
      locked: [],
      required: [],
    },
    fault: null,
    efforts,
    effort: lead?.length
      ? (options.effort ??
        (lead.includes("medium") ? "medium" : (lead.find((level) => level !== "low") ?? null)))
      : null,
  };
}
