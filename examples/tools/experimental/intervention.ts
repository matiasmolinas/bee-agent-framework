import { Emitter } from "bee-agent-framework/emitter/emitter";
import {
  Tool,
  BaseToolRunOptions,
  StringToolOutput,
  ToolInput,
  ToolEvents,
} from "bee-agent-framework/tools/base";
import { z } from "zod";

interface InterventionToolEvents extends ToolEvents<ToolInput<InterventionTool>, StringToolOutput> {
  intervention_requested: (
    input: z.infer<ReturnType<typeof InterventionTool.prototype.inputSchema>>
  ) => void;
}

export class InterventionTool extends Tool<StringToolOutput> {
  name = "InterventionTool";
  description = `
  This tool handles various human interventions such as validation, correction, and clarification.
  
  The agent MUST invoke this tool when a specific type of human interaction is required.
  
  The output must adhere strictly to the following structure:
    - Type: The type of intervention (e.g., "validation", "correction", "clarification").
    - Function Name: InterventionTool
    - Function Input: { "message": "Your intervention message to the user." }
    - Function Output: The user's response in JSON format.
  
  Examples:
    - Validation:
      Input: "Please confirm the following data."
      Output: { "confirmation": "Yes, the data is correct." }
    
    - Correction:
      Input: "There seems to be an error in the previous step. Please provide the correct value."
      Output: { "correction": "The value should be 42 instead of 24." }
  `;

  public readonly emitter: Emitter<InterventionToolEvents> = Emitter.root.child({
    namespace: ["tool", "intervention"],
    creator: this,
  });

  private reader: ReturnType<typeof import("../../helpers/io.js").createConsoleReader>;

  constructor(reader: ReturnType<typeof import("../../helpers/io.js").createConsoleReader>) {
    super();
    this.reader = reader;
  }

  inputSchema = () =>
    z.object({
      type: z.enum(["validation", "correction", "clarification"]),
      message: z.string().min(1, "Message cannot be empty"),
    });

  async _run(
    input: z.infer<ReturnType<typeof this.inputSchema>>,
    _options: BaseToolRunOptions,
  ): Promise<StringToolOutput> {
    // Emit an event for the intervention
    await this.emitter.emit("intervention_requested", input);

    // Display the intervention message to the user
    this.reader.write("InterventionTool", input.message);

    // Prompt the user for input
    const userInput = await this.reader.askSingleQuestion("User 👤 : ");

    // Format the output based on intervention type
    let formattedOutput;
    switch (input.type) {
      case "validation":
        formattedOutput = `{
          "confirmation": "${userInput.trim()}"
        }`;
        break;
      case "correction":
        formattedOutput = `{
          "correction": "${userInput.trim()}"
        }`;
        break;
      case "clarification":
        formattedOutput = `{
          "clarification": "${userInput.trim()}"
        }`;
        break;
      default:
        formattedOutput = `{ "response": "${userInput.trim()}" }`;
    }

    return new StringToolOutput(formattedOutput);
  }
}