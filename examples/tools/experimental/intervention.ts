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
  This tool enables collaborative decision-making and plan refinement AFTER initial information
  gathering. It creates "decision hooks" where humans can guide the planning process through
  validation, correction, and choice between multiple options.

  PRIMARY USE CASES:
  1. Presenting multiple solution options for user choice
  2. Validating proposed plans or assumptions
  3. Correcting and refining plan elements
  4. Enabling mix-and-match of different options

  The tool supports three intervention types:
  - "clarification": Refining specific aspects of proposed options
  - "validation": Confirming plans align with user preferences
  - "correction": Adjusting plans based on user feedback

  The output must follow this structure:
  - Thought: Why this intervention point needs user input
  - Type: One of "clarification", "validation", or "correction"
  - Function Name: InterventionTool
  - Function Input: { "message": "Your intervention message to the user." }
  - Function Output: The user's response in JSON format

  Examples:

  - Example (Multiple Options):
    Context: After gathering basic preferences for Prague trip
    Thought: "Present two distinct planning options for user choice"
    Type: clarification
    Function Name: InterventionTool
    Function Input: { 
      "message": "I've prepared two options:
      Option A (Cultural): Morning castle tour, afternoon Old Town, evening concert
      Option B (Adventure): Morning bike ride, afternoon kayaking, evening local bars
      Would you prefer one of these or would you like to mix elements from both?" 
    }
    Function Output: { "clarification": "I'd like to mix them - castle tour and bike ride sound great" }

  - Example (Plan Refinement):
    Context: After user chooses to mix activities
    Thought: "Need to refine combined plan details"
    Type: correction
    Function Name: InterventionTool
    Function Input: { 
      "message": "I'll combine the castle tour and bike ride. For the afternoon, would you prefer a relaxing activity like a café visit or something more active?" 
    }
    Function Output: { "correction": "A café visit would be perfect for the afternoon" }

  - Example (Plan Validation):
    Context: After creating mixed itinerary
    Thought: "Validate final plan timing and preferences"
    Type: validation
    Function Name: InterventionTool
    Function Input: { 
      "message": "Here's the plan: Castle tour (9-11), bike ride (11:30-1), café (2-4). Does this timing and order work for you?" 
    }
    Function Output: { "validation": "Yes, but can we start the castle tour earlier?" }

  WHEN TO USE:
  1. After initial information gathering (post-HumanTool)
  2. When presenting multiple viable options
  3. When refining and combining plan elements
  4. When validating final plans
  5. When user feedback indicates need for adjustments

  DECISION HOOKS GUIDELINES:
  1. Present clear, distinct options when possible
  2. Allow mixing and matching of elements
  3. Make decision points explicit
  4. Maintain context between interventions
  5. Show how user choices influence the final plan

  Note: This tool is for collaborative refinement AFTER initial planning starts.
  For initial information gathering, use HumanTool instead.
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
