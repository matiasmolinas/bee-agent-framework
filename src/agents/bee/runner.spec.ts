/**
 * Copyright 2024 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BeeAgentRunner } from "@/agents/bee/runner.js";
import { UnconstrainedMemory } from "@/memory/unconstrainedMemory.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { BaseMemory } from "@/memory/base.js";
import { BeeUserPrompt } from "@/agents/bee/prompts.js";
import { zip } from "remeda";

vi.mock("@/memory/tokenMemory.js", async () => {
  const { UnconstrainedMemory } = await import("@/memory/unconstrainedMemory.js");
  class TokenMemory extends UnconstrainedMemory {}
  return { TokenMemory };
});

describe("Bee Agent Runner", () => {
  it("Handles different prompt input source", async () => {
    const createMemory = async () => {
      const memory = new UnconstrainedMemory();
      await memory.addMany([
        BaseMessage.of({
          role: Role.USER,
          text: "What is your name?",
        }),
        BaseMessage.of({
          role: Role.ASSISTANT,
          text: "I am Bee",
        }),
      ]);
      return memory;
    };

    const createInstance = async (memory: BaseMemory, prompt: string | null) => {
      return await BeeAgentRunner.create(
        {
          llm: expect.any(Function),
          memory,
          tools: [],
          templates: {},
        },
        {},
        prompt,
      );
    };

    const memory = await createMemory();
    const prompt = "What can you do for me?";
    const instance = await createInstance(memory, prompt);

    const memory2 = await createMemory();
    await memory2.add(BaseMessage.of({ role: Role.USER, text: prompt }));
    const instance2 = await createInstance(memory2, null);
    expect(instance.memory.messages).toEqual(instance2.memory.messages);
  });

  it.each([
    BeeUserPrompt,
    BeeUserPrompt.fork((old) => ({ ...old, template: `{{input}}` })),
    BeeUserPrompt.fork((old) => ({ ...old, template: `User: {{input}}` })),
    BeeUserPrompt.fork((old) => ({ ...old, template: `` })),
  ])("Correctly formats user input", async (template: typeof BeeUserPrompt) => {
    const memory = new UnconstrainedMemory();
    await memory.addMany([
      BaseMessage.of({
        role: Role.USER,
        text: "What is your name?",
      }),
      BaseMessage.of({
        role: Role.ASSISTANT,
        text: "Bee",
      }),
      BaseMessage.of({
        role: Role.USER,
        text: "Who are you?",
      }),
      BaseMessage.of({
        role: Role.ASSISTANT,
        text: "I am a helpful assistant that uses tools to answer questions.",
      }),
    ]);

    const prompt = "What can you do for me?";
    const instance = await BeeAgentRunner.create(
      {
        llm: expect.any(Function),
        memory,
        tools: [],
        templates: {
          user: template,
        },
      },
      {},
      prompt,
    );

    for (const [a, b] of zip(
      [
        ...memory.messages.filter((msg) => msg.role === Role.USER),
        BaseMessage.of({ role: Role.USER, text: prompt }),
      ],
      instance.memory.messages.filter((msg) => msg.role === Role.USER),
    )) {
      expect(template.render({ input: a.text })).toStrictEqual(b.text);
    }
  });
});