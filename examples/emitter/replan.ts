import { Callback } from "bee-agent-framework/emitter/types";
import { AnyTool } from "bee-agent-framework/tools/base";
import { RePlanState } from "bee-agent-framework/agents/experimental/replan/prompts";
import { RePlanToolCall } from "bee-agent-framework/agents/experimental/replan/agent";

export interface RePlanEvents {
  update: Callback<{ state: RePlanState }>;
  tool: Callback<
    | { type: "start"; tool: AnyTool; input: any; calls: RePlanToolCall[] }
    | { type: "success"; tool: AnyTool; input: any; output: any; calls: RePlanToolCall[] }
    | { type: "error"; tool: AnyTool; input: any; error: Error; calls: RePlanToolCall[] }
  >;
  intervention_requested: Callback<{
    type: "validation" | "correction" | "clarification";
    message: string;
  }>;
  intervention_completed: Callback<{
    type: "validation" | "correction" | "clarification";
    response: string;
  }>;
}