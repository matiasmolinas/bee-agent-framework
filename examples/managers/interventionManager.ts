import { Emitter } from "bee-agent-framework/emitter/emitter";
import { InterventionTool } from "../tools/experimental/intervention.js";
import { Logger } from "bee-agent-framework/logger/logger";
import { FrameworkError } from "bee-agent-framework/errors";
import { z } from "zod";
import { Callback } from "bee-agent-framework/emitter/types";

type InterventionInput = z.infer<ReturnType<typeof InterventionTool.prototype.inputSchema>>;

interface InterventionEvents {
  intervention_requested: Callback<InterventionInput>;
  intervention_completed: Callback<{ type: string; response: string }>;
}

export class InterventionManager {
  private emitter: Emitter;
  private interventionTool: InterventionTool;
  private logger: Logger;

  constructor(emitter: Emitter, interventionTool: InterventionTool) {
    this.emitter = emitter;
    this.interventionTool = interventionTool;
    this.logger = new Logger({ name: "InterventionManager", level: "trace" });
    this.setupListeners();
  }

  private setupListeners() {
    // Listen for intervention requests
    this.emitter.on("intervention_requested", (async (input: unknown) => {
      try {
        const typedInput = input as InterventionInput;
        this.logger.trace(`Intervention requested: ${JSON.stringify(typedInput)}`);
        
        // Invoke the InterventionTool with properly typed input
        const output = await this.interventionTool.run({
          type: typedInput.type,
          message: typedInput.message
        }, {});

        // Handle the intervention output
        await this.handleInterventionOutput(typedInput.type, output.toString());
      } catch (error) {
        this.logger.error(FrameworkError.ensure(error).dump());
      }
    }) as Callback<unknown>);
  }

  private async handleInterventionOutput(
    type: "validation" | "correction" | "clarification",
    userResponse: string
  ) {
    // Process the user's response based on the intervention type
    switch (type) {
      case "validation":
        if (userResponse.toLowerCase() === "yes") {
          this.logger.trace("User confirmed the data.");
          // Proceed with the agent's workflow
        } else {
          this.logger.trace("User did not confirm the data.");
          // Handle the rejection, possibly by pausing or altering the workflow
        }
        break;
      case "correction":
        this.logger.trace(`User provided correction: ${userResponse}`);
        // Apply the correction to the agent's memory or state
        break;
      case "clarification":
        this.logger.trace(`User provided clarification: ${userResponse}`);
        // Use the clarification to proceed with the agent's workflow
        break;
      default:
        this.logger.trace(`User response: ${userResponse}`);
        // Handle other types or default behavior
    }

    // Emit an event to resume the agent's workflow if paused
    await this.emitter.emit("intervention_completed", { type, response: userResponse });
  }
}