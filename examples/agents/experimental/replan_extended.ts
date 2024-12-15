import "dotenv/config.js";
import { FrameworkError } from "bee-agent-framework/errors";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { createConsoleReader } from "examples/helpers/io.js";
import { RePlanAgent } from "bee-agent-framework/agents/experimental/replan/agent";
import { BAMChatLLM } from "bee-agent-framework/adapters/bam/chat";
import { InterventionTool } from "../../tools/experimental/intervention.js";
import { InterventionManager } from "../../managers/interventionManager.js";
import { Emitter } from "bee-agent-framework/emitter/emitter";
import { RePlanEvents } from "../../emitter/replan.js";

const reader = createConsoleReader();

const llm = BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct");

const memory = new UnconstrainedMemory();

const interventionTool = new InterventionTool(reader);

const agent = new RePlanAgent({
  llm,
  memory,
  tools: [new DuckDuckGoSearchTool(), new OpenMeteoTool(), interventionTool],
});

const interventionManager = new InterventionManager(Emitter.root, interventionTool);

try {
  for await (const { prompt } of reader) {
    const response = await agent.run({ prompt }).observe((emitterInstance: Emitter<RePlanEvents>) => {
      emitterInstance.on("update", async ({ state }) => {
        reader.write("💭 ", state.lookback);
        state.plan.forEach((step) => reader.write("➡️ ", step.title));
      });
      emitterInstance.on("tool", (data) => {
        if (data.type === "start") {
          reader.write(`🛠️ `, `Start ${data.tool.name} with ${JSON.stringify(data.input)}`);
        } else if (data.type === "success") {
          reader.write(`🛠 `, `Success ${data.tool.name} with ${JSON.stringify(data.output)}`);
        } else if (data.type === "error") {
          reader.write(
            `🛠 Error ${data.tool.name}`,
            `with ${FrameworkError.ensure(data.error).dump()}`,
          );
        }
      });
      emitterInstance.on("intervention_completed", ({ type, response }) => {
        reader.write("🔄 ", `Intervention '${type}' completed with response: ${response}`);
        // Additional logic can be added here to handle the resumption
      });
    });
    reader.write(`Agent 🤖 : `, response.message.text);
  }
} catch (error) {
  reader.write(`Agent (error) 🤖 : `, FrameworkError.ensure(error).dump());
} finally {
  reader.close();
}