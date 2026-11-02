<script lang="ts">
  import ServerStack01Icon from "@hugeicons/core-free-icons/ServerStack01Icon";
  import Icon from "$shared/ui/Icon";
  import { MARKS } from "./marks";

  /** Every provider a model can come from; mirrors `WorkModelProvider`. */
  type Provider =
    | "anthropic"
    | "open_ai"
    | "google"
    | "deep_seek"
    | "open_router"
    | "xai"
    | "mistral"
    | "groq"
    | "cerebras"
    | "compatible"
    | "cloud"
    | "claude_cli";

  /** A provider's own mark in its own colours; a monochrome mark takes the
   *  surrounding ink, so it holds on a light tile and a dark one. */
  let { provider, size = 16 }: { provider: Provider; size?: number } = $props();
  const uid = $props.id();
  // The person's own Claude plan is still Claude: it wears Anthropic's mark.
  let mark = $derived(MARKS[provider === "claude_cli" ? "anthropic" : provider] ?? null);
</script>

{#if mark}<svg
    class="provider-mark"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    ><defs
      >{#each mark.layers as layer, index (index)}{#if typeof layer.fill === "object"}<linearGradient
            id={`${uid}-${index}`}
            gradientUnits="userSpaceOnUse"
            x1={layer.fill.from[0]}
            y1={layer.fill.from[1]}
            x2={layer.fill.to[0]}
            y2={layer.fill.to[1]}
            >{#each layer.fill.stops as [offset, color, opacity] (offset)}<stop
                {offset}
                stop-color={color}
                stop-opacity={opacity ?? 1}
              />{/each}</linearGradient
          >{/if}{/each}</defs
    ><g transform={`translate(12 12) scale(${mark.scale}) translate(-12 -12)`}
      >{#each mark.layers as layer, index (index)}<path
          d={layer.d}
          fill={typeof layer.fill === "object"
            ? `url(#${uid}-${index})`
            : (layer.fill ?? "currentColor")}
          fill-rule={layer.evenOdd ? "evenodd" : undefined}
          clip-rule={layer.evenOdd ? "evenodd" : undefined}
        />{/each}</g
    ></svg
  >{:else}<Icon icon={ServerStack01Icon} size={Math.round(size * 0.94)} strokeWidth={1.6} />{/if}

<style>
  .provider-mark {
    flex: none;
  }

  @media (forced-colors: active) {
    .provider-mark path {
      fill: CanvasText;
    }
  }
</style>
