import { Emitter } from "bee-agent-framework/emitter/emitter";
import {
  Tool,
  BaseToolRunOptions,
  StringToolOutput,
  ToolInput,
  ToolEvents,
} from "bee-agent-framework/tools/base";
import { z } from "zod";

export class HumanTool extends Tool<StringToolOutput> {
  name = "HumanTool";
  description = `
  This tool enables initial information gathering and basic clarifications at the start of interactions.
  It should be used as the first point of contact when the agent needs to understand user preferences,
  requirements, or constraints before beginning the planning process.

  PRIMARY USE CASES:
  1. Initial information gathering
  2. Basic preference collection
  3. Constraint identification
  4. General clarifications before planning begins

  The output must adhere to this structure:
  - Thought: A clear description of what initial information is needed
  - Function Name: HumanTool
  - Function Input: { "message": "Your question to the user." }
  - Function Output: The user's response in JSON format

  Examples:

  - Example (Initial Query):
    Input: "Help me plan a trip to Europe"
    Thought: "Need to understand basic preferences before starting plan"
    Function Name: HumanTool
    Function Input: { "message": "Could you tell me your preferred type of activities (cultural, outdoor, etc.) and any specific cities you're interested in?" }
    Function Output: { "clarification": "I enjoy cultural activities and would like to visit Prague" }

  - Example (Constraint Identification):
    Input: "Create a weekend itinerary"
    Thought: "Need to understand time and preference constraints"
    Function Name: HumanTool
    Function Input: { "message": "What kind of activities interest you and do you have any time constraints I should know about?" }
    Function Output: { "clarification": "I prefer outdoor activities and have Saturday from 9 AM to 6 PM" }

  USAGE GUIDELINES:
  1. Use at the START of interactions
  2. Focus on gathering INITIAL information
  3. Keep questions open-ended but specific
  4. Avoid asking about plan details - that comes later with InterventionTool
  5. Gather enough information to start creating options

  Note: This tool is for initial information gathering only. Once you have basic information
  and start creating plans, switch to InterventionTool for refinements and choices.
  `;

  public readonly emitter: Emitter<ToolEvents<ToolInput<this>, StringToolOutput>> =
    Emitter.root.child({
      namespace: ["tool", "human"],
      creator: this,
    });

  private reader: ReturnType<typeof import("../../helpers/io.js").createConsoleReader>;

  constructor(reader: ReturnType<typeof import("../../helpers/io.js").createConsoleReader>) {
    super();
    this.reader = reader;
  }

  inputSchema = () =>
    z.object({
      message: z.string().min(1, "Message cannot be empty"),
    });

  async _run(
    input: z.infer<ReturnType<typeof this.inputSchema>>,
    _options: BaseToolRunOptions,
  ): Promise<StringToolOutput> {
    // Use the shared reader instance provided to the constructor
    this.reader.write("HumanTool", input.message);

    // Use askSingleQuestion instead of prompt to avoid interfering with main loop iterator
    const userInput = await this.reader.askSingleQuestion("User 👤 : ");

    // Format the output as required
    const formattedOutput = `{
      "clarification": "${userInput.trim()}"
    }`;

    return new StringToolOutput(formattedOutput);
  }
}
